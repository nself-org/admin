import { logger } from '@/lib/logger'
import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/performance/report - Get performance report
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const result = await executeNselfCommand('perf', ['report', '--json'])

    logger.cli(
      'nself perf report --json',
      result.success,
      Date.now() - startTime,
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate performance report',
          details: result.error || result.stderr,
        },
        { status: 500 },
      )
    }

    let report = null
    try {
      report = JSON.parse(result.stdout || '{}')
    } catch (_parseError) {
      return NextResponse.json({
        success: true,
        data: result.stdout,
        raw: true,
      })
    }

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error) {
    logger.error('Performance report error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate performance report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
