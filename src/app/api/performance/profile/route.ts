import { logger } from '@/lib/logger'
import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import type { PerformanceProfile } from '@/types/performance'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/performance/profile - Get system-wide performance profile
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const result = await executeNselfCommand('perf', ['profile', '--json'])

    logger.cli(
      'nself perf profile --json',
      result.success,
      Date.now() - startTime,
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get performance profile',
          details: result.error || result.stderr,
        },
        { status: 500 },
      )
    }

    let profile: PerformanceProfile | null = null
    try {
      profile = JSON.parse(result.stdout || '{}')
    } catch (_parseError) {
      // Return raw output if not valid JSON
      return NextResponse.json({
        success: true,
        data: result.stdout,
        raw: true,
      })
    }

    return NextResponse.json({
      success: true,
      data: profile,
    })
  } catch (error) {
    logger.error('Performance profile error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get performance profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// POST /api/performance/profile - Profile specific service
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()

  try {
    const body = await request.json()
    const { service } = body

    if (!service || typeof service !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Service name is required' },
        { status: 400 },
      )
    }

    // Validate service name pattern
    if (!/^[a-z][a-z0-9_-]*$/i.test(service)) {
      return NextResponse.json(
        { success: false, error: 'Invalid service name format' },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('perf', [
      'profile',
      service,
      '--json',
    ])

    logger.cli(
      `nself perf profile ${service} --json`,
      result.success,
      Date.now() - startTime,
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to profile service',
          details: result.error || result.stderr,
        },
        { status: 500 },
      )
    }

    let profile = null
    try {
      profile = JSON.parse(result.stdout || '{}')
    } catch (_parseError) {
      return NextResponse.json({
        success: true,
        data: result.stdout,
        raw: true,
      })
    }

    return NextResponse.json({
      success: true,
      service,
      data: profile,
    })
  } catch (error) {
    logger.error('Service profile error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to profile service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
