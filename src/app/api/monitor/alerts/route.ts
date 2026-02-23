import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const limit = searchParams.get('limit') ?? '100'

    const args: string[] = ['monitor', 'alerts', 'list']
    args.push(`--limit=${limit}`)
    if (status) args.push(`--status=${status}`)
    if (severity) args.push(`--severity=${severity}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/monitor/alerts', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      alerts: result.alerts ?? [],
      total: result.total ?? 0,
      active: result.active ?? 0,
      silenced: result.silenced ?? 0,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get alerts', { error: err.message })
    return NextResponse.json(
      { success: false, error: 'Failed to get alerts', details: err.message },
      { status: 500 },
    )
  }
}
