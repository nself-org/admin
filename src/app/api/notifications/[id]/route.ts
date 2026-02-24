import { auth } from '@/lib/auth-db'
import { logger } from '@/lib/logger'
import * as notificationsApi from '@/lib/notifications'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/notifications/[id] - Get a single notification
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
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

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 },
      )
    }

    const notification = await notificationsApi.getNotification(id, userId)

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 },
      )
    }

    logger.api('GET', `/api/notifications/${id}`, 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      notification,
    })
  } catch (error) {
    logger.error('Failed to get notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/notifications/[id] - Update a notification
 * Body:
 *   - read: boolean (optional)
 *   - data: object (optional, merged with existing data)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
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

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 },
      )
    }

    const body = await request.json()

    // Validate that at least one field is provided
    if (body.read === undefined && body.data === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'No update fields provided. Allowed fields: read, data',
        },
        { status: 400 },
      )
    }

    const notification = await notificationsApi.updateNotification(id, userId, {
      read: body.read,
      data: body.data,
    })

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 },
      )
    }

    logger.api('PATCH', `/api/notifications/${id}`, 200, Date.now() - startTime)
    logger.info('Updated notification', { id, updates: Object.keys(body) })

    return NextResponse.json({
      success: true,
      notification,
    })
  } catch (error) {
    logger.error('Failed to update notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/notifications/[id] - Delete a notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
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

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 },
      )
    }

    const deleted = await notificationsApi.deleteNotification(id, userId)

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 },
      )
    }

    logger.api(
      'DELETE',
      `/api/notifications/${id}`,
      200,
      Date.now() - startTime,
    )
    logger.info('Deleted notification', { id })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Notification deleted successfully',
        id,
      },
    })
  } catch (error) {
    logger.error('Failed to delete notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
