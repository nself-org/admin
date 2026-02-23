import { auth } from '@/lib/auth-db'
import { logger } from '@/lib/logger'
import * as notificationsApi from '@/lib/notifications'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/notifications/stats - Get notification statistics
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

    const stats = await notificationsApi.getNotificationStats(userId)

    logger.api('GET', '/api/notifications/stats', 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    logger.error('Failed to get notification stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get notification stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
