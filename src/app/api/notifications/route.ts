import { auth } from '@/lib/auth-db'
import { logger } from '@/lib/logger'
import * as notificationsApi from '@/lib/notifications'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/notifications - Get notifications list
 * Query params:
 *   - limit: number (default 20)
 *   - offset: number (default 0)
 *   - unreadOnly: boolean (default false)
 *   - type: NotificationType
 *   - category: NotificationCategory
 *   - priority: NotificationPriority
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const token = request.cookies.get('session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await auth.validateSession(token)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.userId

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get(
      'type',
    ) as notificationsApi.NotificationType | null
    const category = searchParams.get(
      'category',
    ) as notificationsApi.NotificationCategory | null
    const priority = searchParams.get(
      'priority',
    ) as notificationsApi.NotificationPriority | null

    const result = await notificationsApi.getNotifications(userId, {
      limit,
      offset,
      unreadOnly,
      type: type || undefined,
      category: category || undefined,
      priority: priority || undefined,
    })

    logger.api('GET', '/api/notifications', 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    logger.error('Failed to fetch notifications', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/notifications - Create a new notification
 * Body:
 *   - type: NotificationType (required)
 *   - title: string (required)
 *   - message: string (required)
 *   - priority: NotificationPriority (optional)
 *   - category: NotificationCategory (optional)
 *   - data: object (optional)
 *   - expiresAt: Date (optional)
 *   - actionUrl: string (optional)
 *   - actionLabel: string (optional)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const token = request.cookies.get('session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await auth.validateSession(token)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.userId

    const body = await request.json()

    // Validate required fields
    if (!body.type || !body.title || !body.message) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: type, title, and message are required',
        },
        { status: 400 },
      )
    }

    // Validate type
    const validTypes: notificationsApi.NotificationType[] = [
      'info',
      'success',
      'warning',
      'error',
      'system',
    ]
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        },
        { status: 400 },
      )
    }

    const notification = await notificationsApi.createNotification({
      userId,
      type: body.type,
      priority: body.priority,
      category: body.category,
      title: body.title,
      message: body.message,
      data: body.data,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      actionUrl: body.actionUrl,
      actionLabel: body.actionLabel,
    })

    logger.api('POST', '/api/notifications', 201, Date.now() - startTime)
    logger.info('Created notification', {
      id: notification.id,
      type: notification.type,
      category: notification.category,
    })

    return NextResponse.json({ success: true, notification }, { status: 201 })
  } catch (error) {
    logger.error('Failed to create notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/notifications - Delete all notifications
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const token = request.cookies.get('session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await auth.validateSession(token)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.userId

    const count = await notificationsApi.deleteAllNotifications(userId)

    logger.api('DELETE', '/api/notifications', 200, Date.now() - startTime)
    logger.info('Deleted all notifications', { count })

    return NextResponse.json({
      success: true,
      data: {
        message: 'All notifications deleted',
        count,
      },
    })
  } catch (error) {
    logger.error('Failed to delete notifications', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
