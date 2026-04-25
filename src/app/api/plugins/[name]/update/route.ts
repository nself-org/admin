/**
 * Plugin Update API Route
 * POST: Update a specific plugin to its latest version
 */

import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

const execFileAsync = promisify(execFile)

interface RouteContext {
  params: Promise<{ name: string }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  const { name } = await context.params

  try {
    // Validate plugin name format (alphanumeric, dashes, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plugin name format' },
        { status: 400 },
      )
    }

    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    logger.info('Updating plugin', { name })

    const { stdout, stderr } = await execFileAsync(
      nselfPath,
      ['plugin', 'update', name],
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 120000, // 2 minute timeout for update operations
      },
    )

    logger.cli(`plugin update ${name}`, true, Date.now() - startTime)
    logger.api(
      'POST',
      `/api/plugins/${name}/update`,
      200,
      Date.now() - startTime,
    )

    return NextResponse.json({
      success: true,
      message: `Plugin ${name} updated successfully`,
      output: stdout || stderr,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to update plugin', { name, error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update plugin',
        details: err.message || 'Unknown error',
        output: err.stdout || err.stderr,
      },
      { status: 500 },
    )
  }
}
