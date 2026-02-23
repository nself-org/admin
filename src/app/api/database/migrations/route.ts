import { ErrorCode } from '@/lib/errors/codes'
import { nselfDbMigrate } from '@/lib/nselfCLI'
import { getProjectPath } from '@/lib/paths'
import type { Migration } from '@/types/database'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export async function GET(): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()
    const migrationsDir = path.join(projectPath, 'migrations')

    // Check if migrations directory exists
    try {
      await fs.access(migrationsDir)
    } catch {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    // Read migration files
    const files = await fs.readdir(migrationsDir)
    const migrationFiles = files.filter(
      (f) => f.endsWith('.sql') || f.endsWith('.js'),
    )

    const migrations: Migration[] = migrationFiles.map((file) => {
      // Parse migration filename (e.g., "001_initial_schema.sql")
      const match = file.match(/^(\d+)_(.+)\.(sql|js)$/)
      const id = match?.[1] || '0'
      const name = match?.[2]?.replace(/_/g, ' ') || file

      return {
        id,
        name,
        status: 'pending' as const,
        batch: 0,
      }
    })

    return NextResponse.json({
      success: true,
      data: migrations,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch migrations',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCode.DB_MIGRATION_FAILED,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { action, target } = await request.json()

    if (action === 'run') {
      const result = await nselfDbMigrate({ target })

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Migration failed',
            details: result.stderr || result.error,
            code: ErrorCode.DB_MIGRATION_FAILED,
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          message: 'Migrations applied successfully',
          output: result.stdout,
        },
      })
    }

    if (action === 'create') {
      const { name, template = 'empty' } = await request.json()

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error: 'Migration name is required',
            code: ErrorCode.VALIDATION_ERROR,
          },
          { status: 400 },
        )
      }

      const projectPath = getProjectPath()
      const migrationsDir = path.join(projectPath, 'migrations')

      // Create migrations directory if it doesn't exist
      await fs.mkdir(migrationsDir, { recursive: true })

      // Get next migration number
      const files = await fs.readdir(migrationsDir)
      const numbers = files
        .map((f) => parseInt(f.match(/^(\d+)_/)?.[1] || '0'))
        .filter((n) => !isNaN(n))
      const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1

      // Create migration file
      const filename = `${String(nextNum).padStart(3, '0')}_${name.replace(/\s+/g, '_')}.sql`
      const filepath = path.join(migrationsDir, filename)

      let content = '-- Migration: ' + name + '\n\n'
      if (template === 'create_table') {
        content += `CREATE TABLE IF NOT EXISTS table_name (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`
      } else if (template === 'alter_table') {
        content += `ALTER TABLE table_name
  ADD COLUMN new_column VARCHAR(255);
`
      }

      await fs.writeFile(filepath, content, 'utf-8')

      return NextResponse.json({
        success: true,
        data: {
          filename,
          path: filepath,
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action',
        code: ErrorCode.VALIDATION_ERROR,
      },
      { status: 400 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Migration operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCode.DB_MIGRATION_FAILED,
      },
      { status: 500 },
    )
  }
}
