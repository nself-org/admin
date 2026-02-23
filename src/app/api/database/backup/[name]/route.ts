import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

/**
 * GET /api/database/backup/[name] - Download a backup file
 * Streams the backup file for download
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const { name } = await params

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Backup name is required' },
        { status: 400 },
      )
    }

    // Validate filename format to prevent path traversal
    if (!isValidBackupFilename(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup filename' },
        { status: 400 },
      )
    }

    const fs = await import('fs/promises')
    const { createReadStream } = await import('fs')

    // Look for the backup file in known directories
    const backupDirs = ['/backups', process.env.NSELF_BACKUP_DIR || './backups']

    let backupPath: string | null = null
    let fileStats: Awaited<ReturnType<typeof fs.stat>> | null = null

    for (const dir of backupDirs) {
      const candidatePath = path.join(dir, name)
      // Security: Ensure resolved path is still within the backup directory
      const resolvedPath = path.resolve(candidatePath)
      const resolvedDir = path.resolve(dir)

      if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
        continue // Path traversal attempt
      }

      try {
        fileStats = await fs.stat(resolvedPath)
        if (fileStats.isFile()) {
          backupPath = resolvedPath
          break
        }
      } catch (_e) {
        // File not found in this directory, try next
      }
    }

    if (!backupPath || !fileStats) {
      return NextResponse.json(
        { success: false, error: 'Backup file not found' },
        { status: 404 },
      )
    }

    // Create readable stream and return as response
    const stream = createReadStream(backupPath)
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => {
          controller.enqueue(chunk)
        })
        stream.on('end', () => {
          controller.close()
        })
        stream.on('error', (err) => {
          controller.error(err)
        })
      },
    })

    // Determine content type
    const contentType = name.endsWith('.gz')
      ? 'application/gzip'
      : 'application/sql'

    logger.api(
      'GET',
      `/api/database/backup/${name}`,
      200,
      Date.now() - startTime,
    )

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${name}"`,
        'Content-Length': String(fileStats.size),
      },
    })
  } catch (error) {
    logger.error('Failed to download backup', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to download backup',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/database/backup/[name] - Delete a backup file
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const { name } = await params

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Backup name is required' },
        { status: 400 },
      )
    }

    // Validate filename format to prevent path traversal
    if (!isValidBackupFilename(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup filename' },
        { status: 400 },
      )
    }

    const fs = await import('fs/promises')

    // Look for the backup file in known directories
    const backupDirs = ['/backups', process.env.NSELF_BACKUP_DIR || './backups']

    let backupPath: string | null = null

    for (const dir of backupDirs) {
      const candidatePath = path.join(dir, name)
      // Security: Ensure resolved path is still within the backup directory
      const resolvedPath = path.resolve(candidatePath)
      const resolvedDir = path.resolve(dir)

      if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
        continue // Path traversal attempt
      }

      try {
        const stats = await fs.stat(resolvedPath)
        if (stats.isFile()) {
          backupPath = resolvedPath
          break
        }
      } catch (_e) {
        // File not found in this directory, try next
      }
    }

    if (!backupPath) {
      return NextResponse.json(
        { success: false, error: 'Backup file not found' },
        { status: 404 },
      )
    }

    await fs.unlink(backupPath)

    logger.api(
      'DELETE',
      `/api/database/backup/${name}`,
      200,
      Date.now() - startTime,
    )
    logger.info('Deleted backup file', { name, path: backupPath })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Backup deleted successfully',
        name,
      },
    })
  } catch (error) {
    logger.error('Failed to delete backup', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete backup',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * Validate backup filename to prevent path traversal attacks
 */
function isValidBackupFilename(filename: string): boolean {
  // Must not contain path separators or parent directory references
  if (
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..')
  ) {
    return false
  }

  // Must match expected backup filename pattern
  const validPattern = /^[a-zA-Z0-9_-]+\.(sql|dump)(\.gz)?$/
  return validPattern.test(filename)
}
