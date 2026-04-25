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
      source,
      target,
      paths,
      excludePaths,
      delete: deleteRemoved,
      dryRun,
      force,
    } = body

    const args: string[] = ['sync', 'files']
    if (source) args.push(`--source=${source}`)
    if (target) args.push(`--target=${target}`)
    if (paths && Array.isArray(paths)) args.push(`--paths=${paths.join(',')}`)
    if (excludePaths && Array.isArray(excludePaths))
      args.push(`--exclude-paths=${excludePaths.join(',')}`)
    if (deleteRemoved) args.push('--delete')
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

    logger.api('POST', '/api/sync/files', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? 'File sync completed',
      filesSynced: result.filesSynced ?? [],
      filesDeleted: result.filesDeleted ?? [],
      bytesTransferred: result.bytesTransferred ?? 0,
      dryRun: dryRun ?? false,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to sync files', { error: err.message })
    return NextResponse.json(
      { success: false, error: 'Failed to sync files', details: err.message },
      { status: 500 },
    )
  }
}
