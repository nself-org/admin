import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse } from 'next/server'

/**
 * GET /api/auth/rate-limit/status
 * Returns current rate limit usage/status via nself auth rate-limit status
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('auth', ['rate-limit', 'status'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch rate limit status',
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
        error: 'Failed to fetch rate limit status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
