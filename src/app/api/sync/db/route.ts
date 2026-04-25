import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

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
      tables,
      excludeTables,
      dataOnly,
      schemaOnly,
      dryRun,
      force,
    } = body

    const args: string[] = ['sync', 'db']
    if (source) args.push(`--source=${source}`)
    if (target) args.push(`--target=${target}`)
    if (tables && Array.isArray(tables))
      args.push(`--tables=${tables.join(',')}`)
    if (excludeTables && Array.isArray(excludeTables))
      args.push(`--exclude-tables=${excludeTables.join(',')}`)
    if (dataOnly) args.push('--data-only')
    if (schemaOnly) args.push('--schema-only')
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

    logger.api('POST', '/api/sync/db', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? 'Database sync completed',
      tablessynced: result.tablesSynced ?? [],
      rowsTransferred: result.rowsTransferred ?? 0,
      dryRun: dryRun ?? false,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to sync database', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync database',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
