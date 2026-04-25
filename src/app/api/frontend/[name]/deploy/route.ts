import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

const execAsync = promisify(exec)

interface RouteParams {
  params: Promise<{ name: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  try {
    const { name } = await params
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const { environment, branch, skipBuild, preview, cdn } = body

    const args: string[] = ['frontend', 'deploy', name]
    if (environment) args.push(`--environment=${environment}`)
    if (branch) args.push(`--branch=${branch}`)
    if (skipBuild) args.push('--skip-build')
    if (preview) args.push('--preview')
    if (cdn) args.push(`--cdn=${cdn}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 600000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api(
      'POST',
      `/api/frontend/${name}/deploy`,
      200,
      Date.now() - startTime,
    )
    return NextResponse.json({
      success: true,
      message: result.message ?? `Frontend app ${name} deployed`,
      deployment: {
        id: result.deploymentId,
        url: result.url,
        environment: environment ?? 'production',
        status: result.status ?? 'deployed',
        createdAt: result.createdAt ?? new Date().toISOString(),
      },
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to deploy frontend app', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to deploy frontend app',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
