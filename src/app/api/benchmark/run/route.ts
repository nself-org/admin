import { logger } from '@/lib/logger'
import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import type { BenchmarkResult } from '@/types/performance'
import { NextRequest, NextResponse } from 'next/server'

// Valid benchmark targets
const VALID_TARGETS = ['api', 'database', 'full', 'graphql', 'auth', 'storage']

// POST /api/benchmark/run - Run benchmark
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()

  try {
    const body = await request.json()
    const { target, options = {} } = body

    if (!target || typeof target !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Benchmark target is required' },
        { status: 400 },
      )
    }

    // Validate target
    if (!VALID_TARGETS.includes(target)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid benchmark target. Valid targets: ${VALID_TARGETS.join(', ')}`,
        },
        { status: 400 },
      )
    }

    // Build args
    const args = ['run', target, '--json']

    // Add optional parameters
    if (options.duration && /^\d+[smh]?$/.test(String(options.duration))) {
      args.push('--duration', String(options.duration))
    }
    if (options.concurrency && /^\d+$/.test(String(options.concurrency))) {
      args.push('--concurrency', String(options.concurrency))
    }
    if (options.requests && /^\d+$/.test(String(options.requests))) {
      args.push('--requests', String(options.requests))
    }

    const result = await executeNselfCommand('bench', args, { timeout: 300000 })

    logger.cli(
      `nself bench run ${target} --json`,
      result.success,
      Date.now() - startTime,
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Benchmark failed',
          details: result.error || result.stderr,
        },
        { status: 500 },
      )
    }

    let benchmarkResult: BenchmarkResult | null = null
    try {
      benchmarkResult = JSON.parse(result.stdout || '{}')
    } catch (_parseError) {
      return NextResponse.json({
        success: true,
        data: result.stdout,
        raw: true,
      })
    }

    return NextResponse.json({
      success: true,
      target,
      data: benchmarkResult,
    })
  } catch (error) {
    logger.error('Benchmark run error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run benchmark',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
