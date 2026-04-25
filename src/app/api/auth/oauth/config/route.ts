import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * GET /api/auth/oauth/config?provider=<name>
 * Gets OAuth provider configuration via nself auth oauth config --provider=<name>
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const provider = request.nextUrl.searchParams.get('provider')

    if (!provider) {
      return NextResponse.json(
        { success: false, error: 'Provider query parameter is required' },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('auth', [
      'oauth',
      'config',
      `--provider=${provider.toLowerCase()}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to get config for provider: ${provider}`,
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
        error: 'Failed to get OAuth provider config',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/auth/oauth/config
 * Sets OAuth provider configuration via nself auth oauth config
 * Body: { provider, clientId, clientSecret, redirectUri }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { provider, clientId, clientSecret, redirectUri } = body

    if (!provider || typeof provider !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Provider name is required' },
        { status: 400 },
      )
    }

    if (!clientId || typeof clientId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 },
      )
    }

    if (!clientSecret || typeof clientSecret !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Client Secret is required' },
        { status: 400 },
      )
    }

    const args = [
      'oauth',
      'config',
      `--provider=${provider.toLowerCase()}`,
      `--client-id=${clientId}`,
      `--client-secret=${clientSecret}`,
    ]

    if (redirectUri && typeof redirectUri === 'string') {
      args.push(`--redirect-uri=${redirectUri}`)
    }

    const result = await executeNselfCommand('auth', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to configure provider: ${provider}`,
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
        error: 'Failed to configure OAuth provider',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
