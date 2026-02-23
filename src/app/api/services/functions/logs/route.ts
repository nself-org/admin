import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse } from 'next/server'

/**
 * GET /api/services/functions/logs
 * Retrieves function logs via nself service functions logs
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('service', ['functions', 'logs'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to retrieve function logs',
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
        error: 'Failed to retrieve function logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
