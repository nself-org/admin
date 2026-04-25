import { executeNselfCommand } from '@/lib/nselfCLI'
import { getProjectPath } from '@/lib/paths'
import { promises as fs } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { requireAuth } from '@/lib/require-auth'

/**
 * POST /api/config/import
 * Import configuration from uploaded content
 * Body: { environment: string, content: string, format: 'json' | 'yaml', preview?: boolean }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { environment, content, format, preview } = body

    if (!environment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Environment is required',
        },
        { status: 400 },
      )
    }

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration content is required',
        },
        { status: 400 },
      )
    }

    const allowedEnvs = ['local', 'dev', 'stage', 'prod']
    if (!allowedEnvs.includes(environment)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid environment. Allowed: ${allowedEnvs.join(', ')}`,
        },
        { status: 400 },
      )
    }

    const importFormat = format === 'yaml' ? 'yaml' : 'json'

    // Write content to a temporary file for nself to process
    const projectPath = getProjectPath()
    const tmpFile = path.join(
      projectPath,
      `.nself-import-${Date.now()}.${importFormat}`,
    )

    try {
      await fs.writeFile(tmpFile, content, 'utf-8')

      const args = [
        'import',
        `--env=${environment}`,
        `--format=${importFormat}`,
        `--file=${tmpFile}`,
      ]

      if (preview) {
        args.push('--dry-run')
      }

      const result = await executeNselfCommand('config', args, {
        timeout: 30000,
      })

      return NextResponse.json({
        success: result.success,
        data: {
          environment,
          format: importFormat,
          preview: preview || false,
          output: result.stdout || '',
          stderr: result.stderr || '',
          exitCode: result.exitCode,
          timestamp: new Date().toISOString(),
        },
        ...(result.error ? { error: result.error } : {}),
      })
    } finally {
      // Clean up temporary file
      try {
        await fs.unlink(tmpFile)
      } catch (_error) {
        // Intentionally ignore - temp file cleanup is best-effort
      }
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Config import failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
