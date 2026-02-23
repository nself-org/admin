import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse } from 'next/server'

/**
 * GET /api/services/realtime/channels
 * List real-time channels via nself service realtime channels
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('service', [
      'realtime',
      'channels',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch channels',
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
        error: 'Failed to fetch channels',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
