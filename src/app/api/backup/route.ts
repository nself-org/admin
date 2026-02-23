import { executeNselfCommand, nselfBackup, nselfRestore } from '@/lib/nselfCLI'
import { isRateLimited } from '@/lib/rateLimiter'
import { backupSchema, restoreSchema, validateRequest } from '@/lib/validation'
import { NextRequest, NextResponse } from 'next/server'

// List backups
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('backup', ['list', '--json'])

    if (!result.success) {
      // If list command not available, try to read from default backup directory
      const backupDir = '/backups'
      const backups = []

      try {
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execAsync = promisify(exec)

        const { stdout } = await execAsync(
          `ls -la ${backupDir}/*.sql* 2>/dev/null || echo ""`,
        )
        const files = stdout.split('\n').filter((line) => line.includes('.sql'))

        for (const file of files) {
          const parts = file.split(/\s+/)
          if (parts.length >= 9) {
            const filename = parts[parts.length - 1]
            const size = parseInt(parts[4])
            const date = `${parts[5]} ${parts[6]} ${parts[7]}`

            backups.push({
              id: filename,
              name: filename,
              path: `${backupDir}/${filename}`,
              size,
              created: date,
              type: filename.includes('.gz') ? 'compressed' : 'plain',
            })
          }
        }
      } catch {
        // Backup directory listing failed - return empty list
      }

      return NextResponse.json({
        success: true,
        data: backups,
      })
    }

    const backups = JSON.parse(result.stdout || '[]')

    return NextResponse.json({
      success: true,
      data: backups,
    })
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list backups',
      },
      { status: 500 },
    )
  }
}

// Create backup
export async function POST(request: NextRequest): Promise<NextResponse> {
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

    if (body.action === 'backup') {
      // Validate backup options
      const validation = await validateRequest(body, backupSchema)
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: validation.errors.format(),
          },
          { status: 400 },
        )
      }

      const {
        includeDatabase,
        includeFiles,
        includeConfig,
        compression,
        encryptionKey,
      } = validation.data

      // Build backup command arguments
      const args = []
      if (includeDatabase) args.push('--database')
      if (includeFiles) args.push('--files')
      if (includeConfig) args.push('--config')
      if (compression !== 'none') args.push('--compress', compression)
      if (encryptionKey) args.push('--encrypt', encryptionKey)

      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `backup_${timestamp}.sql${compression === 'gzip' ? '.gz' : ''}`
      args.push('--output', `/backups/${filename}`)

      const result = await nselfBackup(`/backups/${filename}`)

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Backup failed',
            details: result.error,
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          filename,
          path: `/backups/${filename}`,
          timestamp,
          output: result.stdout,
        },
      })
    } else if (body.action === 'restore') {
      // Validate restore options
      const validation = await validateRequest(body, restoreSchema)
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: validation.errors.format(),
          },
          { status: 400 },
        )
      }

      const { backupFile } = validation.data

      // Security: Prevent path traversal in restore
      const pathModule = await import('path')
      const fs = await import('fs/promises')

      const backupsDir = '/backups'
      const normalizedPath = pathModule.normalize(backupFile)

      // Ensure backup file is within /backups directory
      if (
        !normalizedPath.startsWith(backupsDir + '/') ||
        normalizedPath.includes('..')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid backup path - must be within /backups directory',
          },
          { status: 400 },
        )
      }

      // Verify backup file exists
      try {
        await fs.access(normalizedPath)
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: 'Backup file not found',
          },
          { status: 404 },
        )
      }

      const result = await nselfRestore(normalizedPath)

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Restore failed',
            details: result.error,
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          restored: backupFile,
          output: result.stdout,
        },
      })
    } else if (body.action === 'schedule') {
      // Schedule automated backup
      const { frequency, time, retention } = body

      const result = await executeNselfCommand('backup', [
        'schedule',
        '--frequency',
        frequency,
        '--time',
        time,
        '--retention',
        String(retention),
      ])

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to schedule backup',
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          scheduled: true,
          frequency,
          time,
          retention,
        },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Backup operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// Delete backup
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { backupFile } = await request.json()

    if (!backupFile) {
      return NextResponse.json(
        { success: false, error: 'Backup file required' },
        { status: 400 },
      )
    }

    // Security: Prevent path traversal attacks
    const path = await import('path')
    const fs = await import('fs/promises')

    // Resolve the path and check it's still within /backups
    const backupsDir = '/backups'
    const normalizedPath = path.normalize(backupFile)
    const resolvedPath = path.resolve(backupsDir, path.basename(backupFile))

    // Ensure path is within /backups and doesn't contain traversal attempts
    if (
      !normalizedPath.startsWith(backupsDir + '/') ||
      normalizedPath.includes('..') ||
      resolvedPath !== normalizedPath
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup path' },
        { status: 400 },
      )
    }

    // Only allow deletion of backup files (*.sql, *.sql.gz, *.tar.gz)
    const filename = path.basename(normalizedPath)
    if (!/^[a-zA-Z0-9_-]+\.(sql|sql\.gz|tar\.gz|backup)$/i.test(filename)) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup file type' },
        { status: 400 },
      )
    }

    await fs.unlink(normalizedPath)

    return NextResponse.json({
      success: true,
      data: { deleted: backupFile },
    })
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete backup',
      },
      { status: 500 },
    )
  }
}
