/**
 * Plugin Marketplace API Route
 * GET: Fetch available plugins from registry
 */

import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import type { MarketplacePlugin } from '@/types/plugins'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

const REGISTRY_URL = 'https://plugins.nself.org/registry.json'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    let plugins: MarketplacePlugin[] = []

    // First, try to fetch from the registry URL
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetch(REGISTRY_URL, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'nself-admin',
        },
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        plugins = Array.isArray(data) ? data : data.plugins || []

        logger.api(
          'GET',
          '/api/plugins/marketplace',
          200,
          Date.now() - startTime,
        )

        return NextResponse.json({
          success: true,
          plugins,
          count: plugins.length,
          source: 'registry',
        })
      }
    } catch (_fetchError) {
      logger.warn('Failed to fetch from plugin registry, falling back to CLI')
    }

    // Fallback: Use nself CLI to list available plugins
    try {
      const projectPath = getProjectPath()
      const nselfPath = await findNselfPath()

      const { stdout } = await execAsync(
        `${nselfPath} plugin list --available --json`,
        {
          cwd: projectPath,
          env: { ...process.env, PATH: getEnhancedPath() },
          timeout: 30000,
        },
      )

      const parsed = JSON.parse(stdout.trim())
      plugins = Array.isArray(parsed) ? parsed : parsed.plugins || []
    } catch (_cliError) {
      logger.warn('Failed to fetch plugins from CLI')
      // Return empty list if both methods fail
      plugins = []
    }

    logger.api('GET', '/api/plugins/marketplace', 200, Date.now() - startTime)

    return NextResponse.json({
      success: true,
      plugins,
      count: plugins.length,
      source: 'cli',
    })
  } catch (error) {
    const err = error as { message?: string }
    logger.error('Failed to fetch marketplace plugins', { error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch available plugins',
        details: err.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
