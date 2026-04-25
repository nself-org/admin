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

    const args: string[] = ['k8s', 'init']
    if (body.context) args.push(`--context=${body.context}`)
    if (body.namespace) args.push(`--namespace=${body.namespace}`)
    if (body.kubeconfig) args.push(`--kubeconfig=${body.kubeconfig}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 120000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/k8s/init', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? 'K8s configuration initialized',
      context: result.context,
      namespace: result.namespace,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to initialize K8s config', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize K8s config',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
