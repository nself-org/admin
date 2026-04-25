import { logger } from '@/lib/logger'
import { executeNselfCommand } from '@/lib/nselfCLI'
import { isRateLimited } from '@/lib/rateLimiter'
import type { Backup } from '@/types/database'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * GET /api/database/backup - List database backups
 * Executes `nself db backup list --json`
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const result = await executeNselfCommand('db', ['backup', 'list', '--json'])

    if (result.success && result.stdout) {
      try {
        const backups: Backup[] = JSON.parse(result.stdout)
        logger.api('GET', '/api/database/backup', 200, Date.now() - startTime)
        return NextResponse.json({
          success: true,
          data: backups,
        })
      } catch (_parseError) {
        // If JSON parse fails, try to parse the output manually
        logger.warn('Failed to parse backup list JSON', {
          stdout: result.stdout,
        })
      }
    }

    // Fallback: try to list backups from the backup directory
    const fs = await import('fs/promises')
    const path = await import('path')

    const backupDirs = ['/backups', process.env.NSELF_BACKUP_DIR || './backups']

    const backups: Backup[] = []

    for (const dir of backupDirs) {
      try {
        const files = await fs.readdir(dir)

        for (const file of files) {
          if (
            file.endsWith('.sql') ||
            file.endsWith('.sql.gz') ||
            file.endsWith('.dump')
          ) {
            const filePath = path.join(dir, file)
            const stats = await fs.stat(filePath)

            const formatBytes = (bytes: number): string => {
              const sizes = ['B', 'KB', 'MB', 'GB']
              if (bytes === 0) return '0 B'
              const i = Math.floor(Math.log(bytes) / Math.log(1024))
              return (
                Math.round((bytes / Math.pow(1024, i)) * 100) / 100 +
                ' ' +
                sizes[i]
              )
            }

            // Parse filename for metadata
            const isCompressed = file.endsWith('.gz')
            const isDataOnly =
              file.includes('data-only') || file.includes('_data_')
            const isSchemaOnly =
              file.includes('schema-only') || file.includes('_schema_')

            backups.push({
              id: file,
              name: file.replace(/\.(sql|dump)(\.gz)?$/, ''),
              filename: file,
              type: isDataOnly ? 'data' : isSchemaOnly ? 'schema' : 'full',
              size: formatBytes(stats.size),
              compressed: isCompressed,
              environment: detectEnvironment(file),
              createdAt: stats.mtime.toISOString(),
              path: filePath,
            })
          }
        }
      } catch (error) {
        const err = error as NodeJS.ErrnoException
        if (err.code !== 'ENOENT') {
          logger.warn(`Failed to read backup directory: ${dir}`, {
            error: err.message,
          })
        }
      }
    }

    // Sort by creation date, newest first
    backups.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    logger.api('GET', '/api/database/backup', 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      data: backups,
    })
  } catch (error) {
    logger.error('Failed to list backups', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list backups',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/database/backup - Create a new database backup
 * Executes `nself db backup` with options
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()

  // Rate limiting for heavy operations
  if (isRateLimited(request, 'heavy')) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Rate limit exceeded. Please wait before creating another backup.',
      },
      { status: 429 },
    )
  }

  try {
    const body = await request.json()
    const {
      name,
      dataOnly = false,
      schemaOnly = false,
      compress = true,
      tables,
      excludeTables,
    } = body

    // Build command arguments
    const args = ['backup']

    if (name) {
      args.push('--name', sanitizeBackupName(name))
    }

    if (dataOnly) {
      args.push('--data-only')
    } else if (schemaOnly) {
      args.push('--schema-only')
    }

    if (compress) {
      args.push('--compress')
    }

    if (tables && Array.isArray(tables) && tables.length > 0) {
      args.push('--tables', tables.join(','))
    }

    if (
      excludeTables &&
      Array.isArray(excludeTables) &&
      excludeTables.length > 0
    ) {
      args.push('--exclude-tables', excludeTables.join(','))
    }

    logger.info('Creating database backup', { args })

    const result = await executeNselfCommand('db', args)

    if (!result.success) {
      logger.error('Database backup failed', {
        error: result.error,
        stderr: result.stderr,
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Database backup failed',
          details: result.error || result.stderr,
        },
        { status: 500 },
      )
    }

    // Try to parse the backup info from output
    let backupInfo: Partial<Backup> = {}
    if (result.stdout) {
      try {
        backupInfo = JSON.parse(result.stdout)
      } catch (_e) {
        // Extract filename from output if possible
        const filenameMatch = result.stdout.match(
          /Created backup:\s*(.+\.(?:sql|dump)(?:\.gz)?)/i,
        )
        if (filenameMatch) {
          backupInfo.filename = filenameMatch[1].trim()
        }
      }
    }

    logger.api('POST', '/api/database/backup', 200, Date.now() - startTime)
    logger.cli('nself db backup', true, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      data: {
        message: 'Backup created successfully',
        output: result.stdout,
        ...backupInfo,
      },
    })
  } catch (error) {
    logger.error('Failed to create backup', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create backup',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * Detect environment from backup filename
 */
function detectEnvironment(
  filename: string,
): 'local' | 'staging' | 'production' {
  const lower = filename.toLowerCase()
  if (lower.includes('prod') || lower.includes('production')) {
    return 'production'
  }
  if (lower.includes('stage') || lower.includes('staging')) {
    return 'staging'
  }
  return 'local'
}

/**
 * Sanitize backup name to prevent path traversal
 */
function sanitizeBackupName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 64)
}
