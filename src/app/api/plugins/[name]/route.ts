/**
 * Individual Plugin API Routes
 * GET: Get plugin details/status
 * DELETE: Remove/uninstall plugin
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

interface RouteContext {
  params: Promise<{ name: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const startTime = Date.now()
  const { name } = await context.params

  try {
    // Validate plugin name format
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plugin name format' },
        { status: 400 },
      )
    }

    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout, stderr } = await execAsync(
      `${nselfPath} plugin status ${name} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 30000,
      },
    )

    if (stderr && !stdout) {
      logger.warn('Plugin status returned stderr', { name, stderr })
    }

    let plugin: Plugin | null = null
    try {
      plugin = JSON.parse(stdout.trim())
    } catch (_parseError) {
      logger.warn('Failed to parse plugin status JSON', { name })
      return NextResponse.json(
        { success: false, error: 'Failed to parse plugin status' },
        { status: 500 },
      )
    }

    logger.api('GET', `/api/plugins/${name}`, 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      plugin,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get plugin status', { name, error: err.message })

    // Check if plugin not found
    if (
      err.message?.includes('not found') ||
      err.message?.includes('not installed')
    ) {
      return NextResponse.json(
        { success: false, error: `Plugin ${name} not found` },
        { status: 404 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get plugin status',
        details: err.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const startTime = Date.now()
  const { name } = await context.params

  try {
    // Validate plugin name format
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plugin name format' },
        { status: 400 },
      )
    }

    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    logger.info('Removing plugin', { name })

    const { stdout, stderr } = await execAsync(
      `${nselfPath} plugin remove ${name}`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    logger.cli(`plugin remove ${name}`, true, Date.now() - startTime)
    logger.api('DELETE', `/api/plugins/${name}`, 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      message: `Plugin ${name} removed successfully`,
      output: stdout || stderr,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to remove plugin', { name, error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove plugin',
        details: err.message || 'Unknown error',
        output: err.stdout || err.stderr,
      },
      { status: 500 },
    )
  }
}
