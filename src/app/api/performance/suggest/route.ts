import { logger } from '@/lib/logger'
import { executeNselfCommand } from '@/lib/nselfCLI'
import type { OptimizationSuggestion } from '@/types/performance'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/performance/suggest - Get optimization suggestions
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const result = await executeNselfCommand('perf', ['suggest', '--json'])

    logger.cli(
      'nself perf suggest --json',
      result.success,
      Date.now() - startTime,
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get optimization suggestions',
          details: result.error || result.stderr,
        },
        { status: 500 },
      )
    }

    let suggestions: OptimizationSuggestion[] = []
    try {
      suggestions = JSON.parse(result.stdout || '[]')
    } catch (_parseError) {
      return NextResponse.json({
        success: true,
        data: result.stdout,
        raw: true,
      })
    }

    return NextResponse.json({
      success: true,
      data: suggestions,
    })
  } catch (error) {
    logger.error('Optimization suggestions error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get optimization suggestions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
