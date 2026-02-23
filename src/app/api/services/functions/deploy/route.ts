import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse } from 'next/server'

/**
 * POST /api/services/functions/deploy
 * Deploys functions via nself service functions deploy
 */
export async function POST(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('service', ['functions', 'deploy'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to deploy functions',
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
        error: 'Failed to deploy functions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
