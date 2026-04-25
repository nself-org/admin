import { ErrorCode } from '@/lib/errors/codes'
import { nselfDbRestore } from '@/lib/nselfCLI'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export async function GET(): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()
    const backupsDir = path.join(projectPath, 'backups')

    // Check if backups directory exists
    try {
      await fs.access(backupsDir)
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          history: [],
        },
      })
    }

    // Get restore history (mock for now)
    const history: Array<{
      id: string
      backupFile: string
      timestamp: string
      status: string
    }> = []

    return NextResponse.json({
      success: true,
      data: {
        history,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch restore history',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCode.DB_RESTORE_FAILED,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { backupFile, targetDatabase = 'default' } = await request.json()

    if (!backupFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Backup file is required',
          code: ErrorCode.VALIDATION_ERROR,
        },
        { status: 400 },
      )
    }

    const projectPath = getProjectPath()
    const backupPath = path.join(projectPath, 'backups', backupFile)

    // Verify backup file exists
    try {
      await fs.access(backupPath)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Backup file not found',
          code: ErrorCode.BACKUP_NOT_FOUND,
        },
        { status: 404 },
      )
    }

    // Restore database
    const result = await nselfDbRestore(backupPath)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database restore failed',
          details: result.stderr || result.error,
          code: ErrorCode.DB_RESTORE_FAILED,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Database restored successfully',
        output: result.stdout,
        targetDatabase,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Restore operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCode.DB_RESTORE_FAILED,
      },
      { status: 500 },
    )
  }
}
