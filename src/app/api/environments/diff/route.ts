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

    const source = searchParams.get('source') ?? 'development'
    const target = searchParams.get('target') ?? 'staging'

    const { stdout } = await execAsync(
      `${nselfPath} deploy environments diff ${source} ${target} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/environments/diff', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      source,
      target,
      differences: result.differences ?? [],
      added: result.added ?? [],
      removed: result.removed ?? [],
      modified: result.modified ?? [],
      summary: result.summary ?? '',
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get environment diff', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get environment diff',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
