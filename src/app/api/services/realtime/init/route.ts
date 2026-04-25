import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * POST /api/services/realtime/init
 * Initialize the real-time/WebSocket service via nself service realtime init
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { provider, port } = body as {
      provider?: string
      port?: number
    }

    const args = ['realtime', 'init']
    if (provider) {
      if (!/^[a-zA-Z0-9_-]+$/.test(provider)) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid provider name. Only letters, numbers, hyphens, and underscores are allowed.',
          },
          { status: 400 },
        )
      }
      args.push(`--provider=${provider}`)
    }
    if (port) {
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid port number. Must be an integer between 1 and 65535.',
          },
          { status: 400 },
        )
      }
      args.push(`--port=${port}`)
    }

    const result = await executeNselfCommand('service', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to initialize real-time service',
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
        error: 'Failed to initialize real-time service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
