import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const { alertId, alertName, matchers, duration, comment, createdBy } = body

    if (!alertId && !alertName && !matchers) {
      return NextResponse.json(
        { success: false, error: 'Alert identifier or matchers required' },
        { status: 400 },
      )
    }

    const args: string[] = ['monitor', 'alerts', 'silence']
    if (alertId) args.push(`--alert-id=${alertId}`)
    if (alertName) args.push(`--alert-name=${alertName}`)
    if (matchers && typeof matchers === 'object') {
      Object.entries(matchers).forEach(([key, value]) => {
        args.push(`--matcher=${key}=${value}`)
      })
    }
    if (duration) args.push(`--duration=${duration}`)
    if (comment) args.push(`--comment=${comment}`)
    if (createdBy) args.push(`--created-by=${createdBy}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api(
      'POST',
      '/api/monitor/alerts/silence',
      200,
      Date.now() - startTime,
    )
    return NextResponse.json({
      success: true,
      message: result.message ?? 'Alert silenced',
      silenceId: result.silenceId,
      expiresAt: result.expiresAt,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to silence alert', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to silence alert',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
