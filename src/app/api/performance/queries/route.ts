import { logger } from '@/lib/logger'
import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/performance/queries - Get slow queries
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const result = await executeNselfCommand('perf', ['slow-queries', '--json'])

    logger.cli(
      'nself perf slow-queries --json',
      result.success,
      Date.now() - startTime,
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get slow queries',
          details: result.error || result.stderr,
        },
        { status: 500 },
      )
    }

    let queries = null
    try {
      queries = JSON.parse(result.stdout || '[]')
    } catch (_parseError) {
      return NextResponse.json({
        success: true,
        data: result.stdout,
        raw: true,
      })
    }

    return NextResponse.json({
      success: true,
      data: queries,
    })
  } catch (error) {
    logger.error('Slow queries error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get slow queries',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
