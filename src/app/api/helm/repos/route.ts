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

    const { stdout } = await execAsync(`${nselfPath} helm repos list --json`, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 60000,
    })

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/helm/repos', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      repos: result.repos ?? [],
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to list helm repos', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list helm repos',
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

    const { name, url, username, password } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Repository name is required' },
        { status: 400 },
      )
    }

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Repository URL is required' },
        { status: 400 },
      )
    }

    const args: string[] = ['helm', 'repos', 'add', name, url]
    if (username) args.push(`--username=${username}`)
    if (password) args.push(`--password=${password}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/helm/repos', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Repository ${name} added`,
      name,
      url,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to add helm repo', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add helm repo',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
