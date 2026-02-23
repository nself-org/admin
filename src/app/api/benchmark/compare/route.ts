import { logger } from '@/lib/logger'
import { executeNselfCommand } from '@/lib/nselfCLI'
import type { BenchmarkComparison } from '@/types/performance'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/benchmark/compare - Compare current performance to baseline
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const result = await executeNselfCommand('bench', ['compare', '--json'], {
      timeout: 300000,
    })

    logger.cli(
      'nself bench compare --json',
      result.success,
      Date.now() - startTime,
    )

    if (!result.success) {
      // No baseline to compare against
      if (
        result.stderr?.includes('no baseline') ||
        result.error?.includes('no baseline')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'No baseline available for comparison',
            message:
              'Create a baseline first using POST /api/benchmark/baseline',
          },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to compare to baseline',
          details: result.error || result.stderr,
        },
        { status: 500 },
      )
    }

    let comparison: BenchmarkComparison | null = null
    try {
      comparison = JSON.parse(result.stdout || '{}')
    } catch (_parseError) {
      return NextResponse.json({
        success: true,
        data: result.stdout,
        raw: true,
      })
    }

    return NextResponse.json({
      success: true,
      data: comparison,
    })
  } catch (error) {
    logger.error('Benchmark comparison error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to compare to baseline',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
