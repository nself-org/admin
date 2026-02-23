import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const { name, namespace, dryRun, keepHistory } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Release name is required' },
        { status: 400 },
      )
    }

    const args: string[] = ['helm', 'uninstall', name]
    if (namespace) args.push(`--namespace=${namespace}`)
    if (dryRun) args.push('--dry-run')
    if (keepHistory) args.push('--keep-history')

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 180000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/helm/uninstall', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Release ${name} uninstalled`,
      release: name,
      namespace: namespace ?? 'default',
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to uninstall helm release', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to uninstall helm release',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
