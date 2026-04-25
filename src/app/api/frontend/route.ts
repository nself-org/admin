import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

const execAsync = promisify(exec)

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout } = await execAsync(`${nselfPath} frontend list --json`, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 60000,
    })

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/frontend', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      apps: result.apps ?? [],
      total: result.total ?? 0,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to list frontend apps', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list frontend apps',
        details: err.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const { name, framework, path, buildCommand, outputDir, envVars } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'App name is required' },
        { status: 400 },
      )
    }

    const args: string[] = ['frontend', 'add', name]
    if (framework) args.push(`--framework=${framework}`)
    if (path) args.push(`--path=${path}`)
    if (buildCommand) args.push(`--build-command=${buildCommand}`)
    if (outputDir) args.push(`--output-dir=${outputDir}`)
    if (envVars && typeof envVars === 'object') {
      Object.entries(envVars).forEach(([key, value]) => {
        args.push(`--env=${key}=${value}`)
      })
    }

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 120000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/frontend', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Frontend app ${name} added`,
      app: {
        name,
        framework: result.framework ?? framework,
        path: result.path ?? path,
      },
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to add frontend app', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add frontend app',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
