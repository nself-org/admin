import { setConfig } from '@/lib/database'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Validate a DigitalOcean API token by calling GET /v2/account.
 * Returns {valid, email?, error?}.
 */
async function validateDigitalOceanToken(
  token: string,
): Promise<{ valid: boolean; email?: string; error?: string }> {
  const response = await fetch('https://api.digitalocean.com/v2/account', {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    return {
      valid: false,
      error:
        (errorData as { message?: string }).message ||
        `HTTP ${response.status}: ${response.statusText}`,
    }
  }

  const data = await response.json()
  const email = (data as { account?: { email?: string } }).account?.email
  return { valid: true, email }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { apiToken } = await request.json()

    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: 'API token is required' },
        { status: 400 },
      )
    }

    const result = await validateDigitalOceanToken(apiToken)

    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'DigitalOcean token validation failed',
          configured: false,
        },
        { status: 422 },
      )
    }

    await setConfig('cloud_digitalocean_credentials', {
      provider: 'digitalocean',
      configuredAt: new Date().toISOString(),
      accountEmail: result.email,
    })

    return NextResponse.json({
      success: true,
      configured: true,
      message: result.email
        ? `Connected to DigitalOcean as ${result.email}`
        : 'Connected to DigitalOcean successfully',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect to DigitalOcean',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
