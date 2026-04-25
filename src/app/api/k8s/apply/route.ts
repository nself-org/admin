import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

const execAsync = promisify(exec)

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const args: string[] = ['k8s', 'apply']
    if (body.manifest) args.push(`--manifest=${body.manifest}`)
    if (body.namespace) args.push(`--namespace=${body.namespace}`)
    if (body.dryRun) args.push('--dry-run')

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 180000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/k8s/apply', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? 'K8s manifests applied',
      resources: result.resources ?? [],
      dryRun: body.dryRun ?? false,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to apply K8s manifests', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to apply K8s manifests',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
