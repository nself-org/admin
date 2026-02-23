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

    const release = searchParams.get('release')
    const namespace = searchParams.get('namespace')

    if (!release) {
      return NextResponse.json(
        { success: false, error: 'Release name is required' },
        { status: 400 },
      )
    }

    const args: string[] = ['helm', 'status', release]
    if (namespace) args.push(`--namespace=${namespace}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/helm/status', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      release,
      status: result.status ?? 'unknown',
      revision: result.revision,
      updated: result.updated,
      namespace: result.namespace ?? namespace ?? 'default',
      chart: result.chart,
      appVersion: result.appVersion,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get helm release status', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get helm release status',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
