import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * POST /api/auth/oauth/disable
 * Disables an OAuth provider via nself auth oauth disable --provider=<name>
 * Body: { provider: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

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
      'disable',
      `--provider=${provider.toLowerCase()}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to disable provider: ${provider}`,
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
        error: 'Failed to disable OAuth provider',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
