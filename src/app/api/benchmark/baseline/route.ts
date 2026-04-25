import { logger } from '@/lib/logger'
import { executeNselfCommand } from '@/lib/nselfCLI'
import type { BenchmarkBaseline } from '@/types/performance'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

// GET /api/benchmark/baseline - Read saved baseline
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const result = await executeNselfCommand('bench', [
      'baseline',
      '--show',
      '--json',
    ])

    logger.cli(
      'nself bench baseline --show --json',
      result.success,
      Date.now() - startTime,
    )

    if (!result.success) {
      // No baseline exists yet - not an error
      if (
        result.stderr?.includes('no baseline') ||
        result.error?.includes('no baseline')
      ) {
        return NextResponse.json({
          success: true,
          data: null,
          message: 'No baseline has been created yet',
        })
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to read baseline',
          details: result.error || result.stderr,
        },
        { status: 500 },
      )
    }

    let baseline: BenchmarkBaseline | null = null
    try {
      baseline = JSON.parse(result.stdout || 'null')
    } catch (_parseError) {
      return NextResponse.json({
        success: true,
        data: result.stdout,
        raw: true,
      })
    }

    return NextResponse.json({
      success: true,
      data: baseline,
    })
  } catch (error) {
    logger.error('Baseline read error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to read baseline',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// POST /api/benchmark/baseline - Create new baseline
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()

  try {
    const body = await request.json().catch(() => ({}))
    const { name } = body

    const args = ['baseline', '--json']

    // Add optional name
    if (name && typeof name === 'string' && /^[a-zA-Z0-9_-]+$/.test(name)) {
      args.push('--name', name)
    }

    const result = await executeNselfCommand('bench', args, { timeout: 300000 })

    logger.cli('nself bench baseline', result.success, Date.now() - startTime)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create baseline',
          details: result.error || result.stderr,
        },
        { status: 500 },
      )
    }

    let baseline: BenchmarkBaseline | null = null
    try {
      baseline = JSON.parse(result.stdout || '{}')
    } catch (_parseError) {
      return NextResponse.json({
        success: true,
        message: 'Baseline created',
        output: result.stdout,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Baseline created successfully',
      data: baseline,
    })
  } catch (error) {
    logger.error('Baseline creation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create baseline',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
