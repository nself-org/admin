import { ErrorCode } from '@/lib/errors/codes'
import { nselfDbSeed } from '@/lib/nselfCLI'
import { getProjectPath } from '@/lib/paths'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { requireAuth } from '@/lib/require-auth'

export async function GET(): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()
    const seedsDir = path.join(projectPath, 'seeds')

    // Check if seeds directory exists
    try {
      await fs.access(seedsDir)
    } catch {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    // Read seed files
    const files = await fs.readdir(seedsDir)
    const seedFiles = files.filter(
      (f) => f.endsWith('.sql') || f.endsWith('.js'),
    )

    const seeds = seedFiles.map((file) => ({
      name: file,
      type: 'local' as const,
      status: 'available' as const,
    }))

    return NextResponse.json({
      success: true,
      data: seeds,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch seed files',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCode.DB_SEED_FAILED,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { action, force = false } = await request.json()

    if (action === 'run') {
      const result = await nselfDbSeed({ force })

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Seed operation failed',
            details: result.stderr || result.error,
            code: ErrorCode.DB_SEED_FAILED,
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          message: 'Database seeded successfully',
          output: result.stdout,
        },
      })
    }

    if (action === 'preview') {
      const { seedFile } = await request.json()

      if (!seedFile) {
        return NextResponse.json(
          {
            success: false,
            error: 'Seed file is required',
            code: ErrorCode.VALIDATION_ERROR,
          },
          { status: 400 },
        )
      }

      const projectPath = getProjectPath()
      const seedPath = path.join(projectPath, 'seeds', seedFile)

      const content = await fs.readFile(seedPath, 'utf-8')

      return NextResponse.json({
        success: true,
        data: {
          content,
          preview: content.substring(0, 500),
        },
      })
    }

    if (action === 'upload') {
      const { filename, content } = await request.json()

      if (!filename || !content) {
        return NextResponse.json(
          {
            success: false,
            error: 'Filename and content are required',
            code: ErrorCode.VALIDATION_ERROR,
          },
          { status: 400 },
        )
      }

      const projectPath = getProjectPath()
      const seedsDir = path.join(projectPath, 'seeds')

      await fs.mkdir(seedsDir, { recursive: true })

      const filepath = path.join(seedsDir, filename)
      await fs.writeFile(filepath, content, 'utf-8')

      return NextResponse.json({
        success: true,
        data: {
          message: 'Seed file uploaded successfully',
          filename,
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
        error: 'Seed operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: ErrorCode.DB_SEED_FAILED,
      },
      { status: 500 },
    )
  }
}
