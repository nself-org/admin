import { auth } from '@/lib/auth-db'
import { logger } from '@/lib/logger'
import * as notificationsApi from '@/lib/notifications'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/notifications/preferences - Get notification preferences
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

    const preferences = await notificationsApi.getPreferences(userId)

    logger.api(
      'GET',
      '/api/notifications/preferences',
      200,
      Date.now() - startTime,
    )

    return NextResponse.json({
      success: true,
      preferences,
    })
  } catch (error) {
    logger.error('Failed to get notification preferences', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get notification preferences',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/notifications/preferences - Update notification preferences
 * Body:
 *   - enabled: boolean (optional)
 *   - emailEnabled: boolean (optional)
 *   - categories: object (optional, partial update)
 *   - priorities: object (optional, partial update)
 *   - quietHoursEnabled: boolean (optional)
 *   - quietHoursStart: string HH:MM (optional)
 *   - quietHoursEnd: string HH:MM (optional)
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
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

    // Validate quiet hours format if provided
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (body.quietHoursStart && !timeRegex.test(body.quietHoursStart)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid quietHoursStart format. Use HH:MM (24-hour format)',
        },
        { status: 400 },
      )
    }
    if (body.quietHoursEnd && !timeRegex.test(body.quietHoursEnd)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid quietHoursEnd format. Use HH:MM (24-hour format)',
        },
        { status: 400 },
      )
    }

    // Validate categories if provided
    if (body.categories) {
      const validCategories = [
        'service',
        'deployment',
        'database',
        'security',
        'backup',
        'system',
        'update',
        'general',
      ]
      const providedCategories = Object.keys(body.categories)
      const invalidCategories = providedCategories.filter(
        (c) => !validCategories.includes(c),
      )
      if (invalidCategories.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid categories: ${invalidCategories.join(', ')}. Valid categories: ${validCategories.join(', ')}`,
          },
          { status: 400 },
        )
      }
    }

    // Validate priorities if provided
    if (body.priorities) {
      const validPriorities = ['low', 'normal', 'high', 'urgent']
      const providedPriorities = Object.keys(body.priorities)
      const invalidPriorities = providedPriorities.filter(
        (p) => !validPriorities.includes(p),
      )
      if (invalidPriorities.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid priorities: ${invalidPriorities.join(', ')}. Valid priorities: ${validPriorities.join(', ')}`,
          },
          { status: 400 },
        )
      }
    }

    const preferences = await notificationsApi.updatePreferences(userId, {
      enabled: body.enabled,
      emailEnabled: body.emailEnabled,
      categories: body.categories,
      priorities: body.priorities,
      quietHoursEnabled: body.quietHoursEnabled,
      quietHoursStart: body.quietHoursStart,
      quietHoursEnd: body.quietHoursEnd,
    })

    logger.api(
      'PUT',
      '/api/notifications/preferences',
      200,
      Date.now() - startTime,
    )
    logger.info('Updated notification preferences', { userId })

    return NextResponse.json({
      success: true,
      preferences,
    })
  } catch (error) {
    logger.error('Failed to update notification preferences', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update notification preferences',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
