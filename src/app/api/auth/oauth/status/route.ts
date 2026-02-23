import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse } from 'next/server'

/**
 * GET /api/auth/oauth/status
 * Gets the status of all configured OAuth providers via nself auth oauth status
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('auth', ['oauth', 'status'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get OAuth provider status',
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
        error: 'Failed to get OAuth provider status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
