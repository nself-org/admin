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

    const { deployment, revision, namespace } = body

    if (!deployment) {
      return NextResponse.json(
        { success: false, error: 'Deployment name is required' },
        { status: 400 },
      )
    }

    const args: string[] = ['k8s', 'rollback', deployment]
    if (revision) args.push(`--revision=${revision}`)
    if (namespace) args.push(`--namespace=${namespace}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 180000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/k8s/rollback', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Rolled back ${deployment}`,
      deployment,
      revision: revision ?? 'previous',
      namespace: namespace ?? 'default',
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to rollback deployment', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to rollback deployment',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
