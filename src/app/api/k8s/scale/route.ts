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

    const { deployment, replicas, namespace } = body

    if (!deployment) {
      return NextResponse.json(
        { success: false, error: 'Deployment name is required' },
        { status: 400 },
      )
    }

    if (replicas === undefined || replicas < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid replica count is required' },
        { status: 400 },
      )
    }

    const args: string[] = [
      'k8s',
      'scale',
      deployment,
      `--replicas=${replicas}`,
    ]
    if (namespace) args.push(`--namespace=${namespace}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 120000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/k8s/scale', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Scaled ${deployment} to ${replicas} replicas`,
      deployment,
      replicas,
      namespace: namespace ?? 'default',
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to scale deployment', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to scale deployment',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
