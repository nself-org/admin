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

    const {
      name,
      chart,
      namespace,
      values,
      set,
      dryRun,
      wait,
      timeout,
      install,
    } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Release name is required' },
        { status: 400 },
      )
    }

    if (!chart) {
      return NextResponse.json(
        { success: false, error: 'Chart is required' },
        { status: 400 },
      )
    }

    const args: string[] = ['helm', 'upgrade', name, chart]
    if (namespace) args.push(`--namespace=${namespace}`)
    if (values) args.push(`--values=${values}`)
    if (set && typeof set === 'object') {
      Object.entries(set).forEach(([key, value]) => {
        args.push(`--set=${key}=${value}`)
      })
    }
    if (dryRun) args.push('--dry-run')
    if (wait) args.push('--wait')
    if (timeout) args.push(`--timeout=${timeout}`)
    if (install) args.push('--install')

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 600000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/helm/upgrade', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Release ${name} upgraded`,
      release: name,
      namespace: namespace ?? 'default',
      status: result.status,
      revision: result.revision,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to upgrade helm release', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upgrade helm release',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
