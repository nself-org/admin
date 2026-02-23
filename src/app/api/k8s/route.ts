import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout } = await execAsync(`${nselfPath} k8s status --json`, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 60000,
    })

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/k8s', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      connected: result.connected ?? false,
      cluster: result.cluster ?? null,
      deployments: result.deployments ?? [],
      pods: result.pods ?? [],
      namespace: result.namespace ?? 'default',
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get K8s status', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get K8s status',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
