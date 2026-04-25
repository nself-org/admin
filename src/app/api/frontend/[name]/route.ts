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

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const { name } = await params
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout } = await execAsync(
      `${nselfPath} frontend get ${name} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', `/api/frontend/${name}`, 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      app: {
        name,
        ...result.app,
      },
      deployments: result.deployments ?? [],
      status: result.status ?? 'unknown',
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get frontend app', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get frontend app',
        details: err.message,
      },
      { status: 500 },
    )
  }
}

export async function PUT(
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

    const args: string[] = ['frontend', 'update', name]

    if (body.framework) args.push(`--framework=${body.framework}`)
    if (body.path) args.push(`--path=${body.path}`)
    if (body.buildCommand) args.push(`--build-command=${body.buildCommand}`)
    if (body.outputDir) args.push(`--output-dir=${body.outputDir}`)
    if (body.envVars && typeof body.envVars === 'object') {
      Object.entries(body.envVars).forEach(([key, value]) => {
        args.push(`--env=${key}=${value}`)
      })
    }

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('PUT', `/api/frontend/${name}`, 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Frontend app ${name} updated`,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to update frontend app', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update frontend app',
        details: err.message,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
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

    const { stdout } = await execAsync(
      `${nselfPath} frontend remove ${name} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('DELETE', `/api/frontend/${name}`, 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Frontend app ${name} removed`,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to remove frontend app', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove frontend app',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
