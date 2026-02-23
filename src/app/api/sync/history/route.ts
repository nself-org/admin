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
    const type = searchParams.get('type')
    const source = searchParams.get('source')
    const target = searchParams.get('target')

    const args: string[] = ['sync', 'history']
    args.push(`--limit=${limit}`)
    if (type) args.push(`--type=${type}`)
    if (source) args.push(`--source=${source}`)
    if (target) args.push(`--target=${target}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/sync/history', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      history: result.history ?? [],
      total: result.total ?? 0,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get sync history', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get sync history',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
