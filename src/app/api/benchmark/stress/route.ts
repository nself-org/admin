import { logger } from '@/lib/logger'
import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

// Valid stress test targets
const VALID_TARGETS = ['api', 'database', 'full', 'graphql', 'auth', 'storage']

// POST /api/benchmark/stress - Run stress test
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()

  try {
    const body = await request.json()
    const { target, options = {} } = body

    if (!target || typeof target !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Stress test target is required' },
        { status: 400 },
      )
    }

    // Validate target
    if (!VALID_TARGETS.includes(target)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid stress test target. Valid targets: ${VALID_TARGETS.join(', ')}`,
        },
        { status: 400 },
      )
    }

    // Build args
    const args = ['stress', target, '--json']

    // Add optional parameters with validation
    if (options.duration && /^\d+[smh]?$/.test(String(options.duration))) {
      args.push('--duration', String(options.duration))
    }
    if (options.concurrency && /^\d+$/.test(String(options.concurrency))) {
      const concurrency = parseInt(String(options.concurrency))
      // Limit concurrency to reasonable values
      if (concurrency >= 1 && concurrency <= 1000) {
        args.push('--concurrency', String(concurrency))
      }
    }
    if (options.rampUp && /^\d+[smh]?$/.test(String(options.rampUp))) {
      args.push('--ramp-up', String(options.rampUp))
    }
    if (options.maxRps && /^\d+$/.test(String(options.maxRps))) {
      args.push('--max-rps', String(options.maxRps))
    }

    // Stress tests can take a while
    const result = await executeNselfCommand('bench', args, { timeout: 600000 })

    logger.cli(
      `nself bench stress ${target} --json`,
      result.success,
      Date.now() - startTime,
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stress test failed',
          details: result.error || result.stderr,
        },
        { status: 500 },
      )
    }

    let stressResult = null
    try {
      stressResult = JSON.parse(result.stdout || '{}')
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
      data: stressResult,
    })
  } catch (error) {
    logger.error('Stress test error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run stress test',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
