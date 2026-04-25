import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/config/sync
 * Returns the current sync status between environments
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('config', ['sync', '--status'], {
      timeout: 15000,
    })

    return NextResponse.json({
      success: true,
      data: {
        output: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get sync status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/config/sync
 * Sync configuration between environments
 * Body: { source: string, target: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { source, target } = body

    if (!source || !target) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source and target environments are required',
        },
        { status: 400 },
      )
    }

    if (source === target) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source and target environments must be different',
        },
        { status: 400 },
      )
    }

    const allowedEnvs = ['local', 'dev', 'stage', 'prod']
    if (!allowedEnvs.includes(source) || !allowedEnvs.includes(target)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid environment. Allowed: ${allowedEnvs.join(', ')}`,
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand(
      'config',
      ['sync', `--from=${source}`, `--to=${target}`],
      { timeout: 30000 },
    )

    return NextResponse.json({
      success: result.success,
      data: {
        source,
        target,
        output: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode,
        timestamp: new Date().toISOString(),
      },
      ...(result.error ? { error: result.error } : {}),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Config sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
