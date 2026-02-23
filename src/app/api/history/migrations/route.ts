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

    const limit = searchParams.get('limit') ?? '50'
    const status = searchParams.get('status')
    const since = searchParams.get('since')

    const args: string[] = ['history', 'migrations']
    args.push(`--limit=${limit}`)
    if (status) args.push(`--status=${status}`)
    if (since) args.push(`--since=${since}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/history/migrations', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      migrations: result.migrations ?? [],
      total: result.total ?? 0,
      pending: result.pending ?? 0,
      applied: result.applied ?? 0,
      failed: result.failed ?? 0,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get migration history', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get migration history',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
