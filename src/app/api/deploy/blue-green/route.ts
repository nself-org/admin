import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

const execAsync = promisify(exec)

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout } = await execAsync(
      `${nselfPath} deploy blue-green status --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/deploy/blue-green', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      activeSlot: result.activeSlot ?? 'blue',
      blue: result.blue ?? null,
      green: result.green ?? null,
      previewUrl: result.previewUrl ?? null,
      status: result.status ?? 'idle',
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get blue-green status', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get blue-green status',
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
      slot,
      prePromoteTests,
      autoPromote,
      promoteDelay,
    } = body

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Action is required (deploy, switch, rollback, abort)',
        },
        { status: 400 },
      )
    }

    const args: string[] = ['deploy', 'blue-green', action]

    if (action === 'deploy') {
      if (image) args.push(`--image=${image}`)
      if (tag) args.push(`--tag=${tag}`)
      if (slot) args.push(`--slot=${slot}`)
      if (prePromoteTests) args.push('--pre-promote-tests')
      if (autoPromote) args.push('--auto-promote')
      if (promoteDelay) args.push(`--promote-delay=${promoteDelay}`)
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

    logger.api('POST', '/api/deploy/blue-green', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Blue-green ${action} completed`,
      action,
      activeSlot: result.activeSlot,
      status: result.status,
      previewUrl: result.previewUrl,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to execute blue-green action', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute blue-green action',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
