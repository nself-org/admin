import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * GET /api/auth/webhooks
 * Lists all webhooks via nself auth webhooks list
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('auth', ['webhooks', 'list'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list webhooks',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list webhooks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

const VALID_EVENTS = [
  'user.created',
  'user.updated',
  'user.deleted',
  'auth.login',
  'auth.logout',
  'auth.mfa',
  'role.changed',
]

/**
 * POST /api/auth/webhooks
 * Creates a new webhook via nself auth webhooks create
 * Body: { url: string, events: string[], secret?: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { url, events, secret } = body as {
      url?: string
      events?: string[]
      secret?: string
    }

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Webhook URL is required' },
        { status: 400 },
      )
    }

    try {
      new URL(url)
    } catch (_urlError) {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 },
      )
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one event type is required',
        },
        { status: 400 },
      )
    }

    const invalidEvents = events.filter((e) => !VALID_EVENTS.includes(e))
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid event types: ${invalidEvents.join(', ')}. Valid events: ${VALID_EVENTS.join(', ')}`,
        },
        { status: 400 },
      )
    }

    const args = [
      'webhooks',
      'create',
      `--url=${url}`,
      `--events=${events.join(',')}`,
    ]

    if (secret && typeof secret === 'string') {
      args.push(`--secret=${secret}`)
    }

    const result = await executeNselfCommand('auth', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create webhook',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { url, events, output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
