import { auth } from '@/lib/auth-db'
import { logger } from '@/lib/logger'
import * as notificationsApi from '@/lib/notifications'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/notifications/read-all - Mark all notifications as read
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

    const count = await notificationsApi.markAllAsRead(userId)

    logger.api(
      'POST',
      '/api/notifications/read-all',
      200,
      Date.now() - startTime,
    )
    logger.info('Marked all notifications as read', { count })

    return NextResponse.json({
      success: true,
      data: {
        message: 'All notifications marked as read',
        count,
      },
    })
  } catch (error) {
    logger.error('Failed to mark all notifications as read', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to mark all notifications as read',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
