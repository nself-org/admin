import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/oauth/enable
 * Enables an OAuth provider via nself auth oauth enable --provider=<name>
 * Body: { provider: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { provider } = body

    if (!provider || typeof provider !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Provider name is required' },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('auth', [
      'oauth',
      'enable',
      `--provider=${provider.toLowerCase()}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to enable provider: ${provider}`,
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { provider, output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to enable OAuth provider',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
