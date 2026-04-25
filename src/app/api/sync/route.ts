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

    const { stdout } = await execAsync(`${nselfPath} sync status --json`, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 60000,
    })

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/sync', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      status: result.status ?? 'unknown',
      lastSync: result.lastSync ?? null,
      pendingChanges: result.pendingChanges ?? 0,
      components: {
        database: result.database ?? { synced: false },
        files: result.files ?? { synced: false },
        config: result.config ?? { synced: false },
      },
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get sync status', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get sync status',
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

    const { source, target, dryRun, force } = body

    const args: string[] = ['sync', 'all']
    if (source) args.push(`--source=${source}`)
    if (target) args.push(`--target=${target}`)
    if (dryRun) args.push('--dry-run')
    if (force) args.push('--force')

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 600000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/sync', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? 'Sync completed',
      synced: result.synced ?? [],
      skipped: result.skipped ?? [],
      errors: result.errors ?? [],
      dryRun: dryRun ?? false,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to sync', { error: err.message })
    return NextResponse.json(
      { success: false, error: 'Failed to sync', details: err.message },
      { status: 500 },
    )
  }
}
