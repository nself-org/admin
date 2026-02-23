import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

const VALID_PROVIDERS = [
  'google',
  'github',
  'microsoft',
  'slack',
  'apple',
  'twitter',
  'discord',
  'linkedin',
]

/**
 * GET /api/auth/oauth
 * Lists all OAuth providers via nself auth oauth list
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('auth', ['oauth', 'list'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list OAuth providers',
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
        error: 'Failed to list OAuth providers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/auth/oauth
 * Installs an OAuth provider via nself auth oauth install
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

    if (!VALID_PROVIDERS.includes(provider.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid provider: ${provider}. Valid providers: ${VALID_PROVIDERS.join(', ')}`,
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('auth', [
      'oauth',
      'install',
      `--provider=${provider.toLowerCase()}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to install provider: ${provider}`,
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
        error: 'Failed to install OAuth provider',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
