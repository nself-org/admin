import { logger } from '@/lib/logger'
import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/performance/analyze - Get performance analysis
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const result = await executeNselfCommand('perf', ['analyze', '--json'])

    logger.cli(
      'nself perf analyze --json',
      result.success,
      Date.now() - startTime,
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to analyze performance',
          details: result.error || result.stderr,
        },
        { status: 500 },
      )
    }

    let analysis = null
    try {
      analysis = JSON.parse(result.stdout || '{}')
    } catch (_parseError) {
      return NextResponse.json({
        success: true,
        data: result.stdout,
        raw: true,
      })
    }

    return NextResponse.json({
      success: true,
      data: analysis,
    })
  } catch (error) {
    logger.error('Performance analysis error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze performance',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
