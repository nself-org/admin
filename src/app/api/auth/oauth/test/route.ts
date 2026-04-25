import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/oauth/test
 * Tests an OAuth provider connection via nself auth oauth test --provider=<name>
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
      'test',
      `--provider=${provider.toLowerCase()}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: `OAuth test failed for provider: ${provider}`,
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
        error: 'Failed to test OAuth provider',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
