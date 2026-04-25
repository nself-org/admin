/**
 * Plugin Sync API Route
 * POST: Trigger plugin data sync
 */

import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import type { PluginSyncStatus } from '@/types/plugins'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

const execAsync = promisify(exec)

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
    // Validate plugin name format
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plugin name format' },
        { status: 400 },
      )
    }

    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    logger.info('Triggering plugin sync', { name })

    const { stdout, stderr } = await execAsync(
      `${nselfPath} plugin ${name} sync`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 300000, // 5 minute timeout for sync operations
      },
    )

    // Try to parse sync status from output
    let syncStatus: PluginSyncStatus | null = null
    try {
      // Check if output is JSON
      const jsonMatch = stdout.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        syncStatus = JSON.parse(jsonMatch[0])
      }
    } catch (_parseError) {
      // Output is not JSON, that's okay
    }

    logger.cli(`plugin ${name} sync`, true, Date.now() - startTime)
    logger.api('POST', `/api/plugins/${name}/sync`, 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      message: `Plugin ${name} sync completed`,
      output: stdout || stderr,
      syncStatus,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to sync plugin', { name, error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync plugin',
        details: err.message || 'Unknown error',
        output: err.stdout || err.stderr,
      },
      { status: 500 },
    )
  }
}
