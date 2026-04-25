import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/rate-limit/reset
 * Resets rate limit counters via nself auth rate-limit reset
 * Optional body: { endpoint?: string } to reset a specific endpoint
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json().catch(() => ({}))
    const { endpoint } = body as { endpoint?: string }

    const args = ['rate-limit', 'reset']

    if (endpoint && typeof endpoint === 'string') {
      // Validate endpoint category
      const validEndpoints = ['auth', 'api', 'webhooks', 'admin']
      if (!validEndpoints.includes(endpoint)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid endpoint category: ${endpoint}. Valid categories: ${validEndpoints.join(', ')}`,
          },
          { status: 400 },
        )
      }
      args.push(`--endpoint=${endpoint}`)
    }

    const result = await executeNselfCommand('auth', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to reset rate limits',
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
        error: 'Failed to reset rate limits',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
