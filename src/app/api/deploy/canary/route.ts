import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout } = await execAsync(
      `${nselfPath} deploy canary status --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/deploy/canary', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      active: result.active ?? false,
      currentWeight: result.currentWeight ?? 0,
      targetWeight: result.targetWeight ?? 100,
      stable: result.stable ?? null,
      canary: result.canary ?? null,
      metrics: result.metrics ?? {},
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get canary status', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get canary status',
        details: err.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const {
      action,
      image,
      tag,
      initialWeight,
      increment,
      interval,
      maxWeight,
      analysisTemplate,
    } = body

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Action is required (start, promote, rollback, pause, resume)',
        },
        { status: 400 },
      )
    }

    const args: string[] = ['deploy', 'canary', action]

    if (action === 'start') {
      if (image) args.push(`--image=${image}`)
      if (tag) args.push(`--tag=${tag}`)
      if (initialWeight) args.push(`--initial-weight=${initialWeight}`)
      if (increment) args.push(`--increment=${increment}`)
      if (interval) args.push(`--interval=${interval}`)
      if (maxWeight) args.push(`--max-weight=${maxWeight}`)
      if (analysisTemplate) args.push(`--analysis-template=${analysisTemplate}`)
    }

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 300000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/deploy/canary', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Canary ${action} completed`,
      action,
      status: result.status,
      currentWeight: result.currentWeight,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to execute canary action', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute canary action',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
