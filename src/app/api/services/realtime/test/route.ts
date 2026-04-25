import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/services/realtime/test
 * Send a test message via nself service realtime test
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { channel, message, event } = body as {
      channel?: string
      message?: string
      event?: string
    }

    if (
      !channel ||
      typeof channel !== 'string' ||
      channel.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Channel name is required.',
        },
        { status: 400 },
      )
    }

    if (!/^[a-zA-Z0-9._:/-]+$/.test(channel)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid channel name. Only letters, numbers, dots, hyphens, underscores, colons, and slashes are allowed.',
        },
        { status: 400 },
      )
    }

    if (
      !message ||
      typeof message !== 'string' ||
      message.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message content is required.',
        },
        { status: 400 },
      )
    }

    const args = ['realtime', 'test', `--channel=${channel}`]

    if (event) {
      if (!/^[a-zA-Z0-9._:-]+$/.test(event)) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid event name. Only letters, numbers, dots, hyphens, underscores, and colons are allowed.',
          },
          { status: 400 },
        )
      }
      args.push(`--event=${event}`)
    }

    args.push(`--message=${message}`)

    const result = await executeNselfCommand('service', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send test message',
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
        error: 'Failed to send test message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
