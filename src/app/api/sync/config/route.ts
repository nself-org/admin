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

    const { source, target, includeSecrets, excludeKeys, dryRun, force } = body

    const args: string[] = ['sync', 'config']
    if (source) args.push(`--source=${source}`)
    if (target) args.push(`--target=${target}`)
    if (includeSecrets) args.push('--include-secrets')
    if (excludeKeys && Array.isArray(excludeKeys))
      args.push(`--exclude-keys=${excludeKeys.join(',')}`)
    if (dryRun) args.push('--dry-run')
    if (force) args.push('--force')

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 120000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/sync/config', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? 'Config sync completed',
      keysSynced: result.keysSynced ?? [],
      keysSkipped: result.keysSkipped ?? [],
      dryRun: dryRun ?? false,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to sync config', { error: err.message })
    return NextResponse.json(
      { success: false, error: 'Failed to sync config', details: err.message },
      { status: 500 },
    )
  }
}
