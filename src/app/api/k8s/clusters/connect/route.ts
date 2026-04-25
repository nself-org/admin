import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const { context, kubeconfig } = body

    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Cluster context is required' },
        { status: 400 },
      )
    }

    const args: string[] = ['k8s', 'clusters', 'connect', context]
    if (kubeconfig) args.push(`--kubeconfig=${kubeconfig}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/k8s/clusters/connect', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Connected to cluster: ${context}`,
      context,
      cluster: result.cluster,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to connect to K8s cluster', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect to K8s cluster',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
