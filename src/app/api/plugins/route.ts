/**
 * Plugin System API Routes
 * GET: List all installed plugins
 * POST: Install a new plugin
 */

import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import type { Plugin } from '@/types/plugins'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()

  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout, stderr } = await execAsync(
      `${nselfPath} plugin list --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 30000,
      },
    )

    if (stderr && !stdout) {
      logger.warn('Plugin list returned stderr', { stderr })
    }

    let plugins: Plugin[] = []
    try {
      const parsed = JSON.parse(stdout.trim())
      plugins = Array.isArray(parsed) ? parsed : parsed.plugins || []
    } catch (_parseError) {
      logger.warn('Failed to parse plugin list JSON, returning empty array')
      plugins = []
    }

    logger.api('GET', '/api/plugins', 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      plugins,
      count: plugins.length,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to list plugins', { error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list plugins',
        details: err.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()

  try {
    const body = await request.json()
    const { name, version } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Plugin name is required' },
        { status: 400 },
      )
    }

    // Validate plugin name format (alphanumeric, dashes, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plugin name format' },
        { status: 400 },
      )
    }

    // Validate version format before shell interpolation
    if (
      version !== undefined &&
      (typeof version !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(version))
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid version format' },
        { status: 400 },
      )
    }

    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    // Build install command with optional version
    const versionSuffix = version ? `@${version}` : ''
    const command = `${nselfPath} plugin install ${name}${versionSuffix}`

    logger.info('Installing plugin', { name, version })

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 120000, // 2 minute timeout for installation
    })

    logger.cli(`plugin install ${name}`, true, Date.now() - startTime)
    logger.api('POST', '/api/plugins', 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      message: `Plugin ${name} installed successfully`,
      output: stdout || stderr,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to install plugin', { error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to install plugin',
        details: err.message || 'Unknown error',
        output: err.stdout || err.stderr,
      },
      { status: 500 },
    )
  }
}
