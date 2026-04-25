import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const { searchParams } = new URL(request.url)

    const release = searchParams.get('release')
    const namespace = searchParams.get('namespace')
    const all = searchParams.get('all') === 'true'

    if (!release) {
      return NextResponse.json(
        { success: false, error: 'Release name is required' },
        { status: 400 },
      )
    }

    const args: string[] = ['helm', 'values', release]
    if (namespace) args.push(`--namespace=${namespace}`)
    if (all) args.push('--all')

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/helm/values', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      release,
      values: result.values ?? result,
      namespace: namespace ?? 'default',
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get helm values', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get helm values',
        details: err.message,
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const { chart, values } = body

    if (!chart) {
      return NextResponse.json(
        { success: false, error: 'Chart path is required' },
        { status: 400 },
      )
    }

    if (!values) {
      return NextResponse.json(
        { success: false, error: 'Values are required' },
        { status: 400 },
      )
    }

    const args: string[] = ['helm', 'values', 'set', chart]
    args.push(`--values=${JSON.stringify(values)}`)

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('PUT', '/api/helm/values', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? 'Helm values updated',
      chart,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to update helm values', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update helm values',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
