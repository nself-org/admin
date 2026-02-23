/**
 * Plugin Configuration API Routes
 * GET: Read plugin configuration from ~/.nself/plugins/{name}/config.json
 * PUT: Update plugin configuration
 */

import { logger } from '@/lib/logger'
import type { PluginConfig } from '@/types/plugins'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import os from 'os'
import path from 'path'

interface RouteContext {
  params: Promise<{ name: string }>
}

function getPluginConfigPath(pluginName: string): string {
  const home = os.homedir()
  return path.join(home, '.nself', 'plugins', pluginName, 'config.json')
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
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

    const configPath = getPluginConfigPath(name)

    try {
      const configData = await fs.readFile(configPath, 'utf-8')
      const config: PluginConfig = JSON.parse(configData)

      logger.api(
        'GET',
        `/api/plugins/${name}/config`,
        200,
        Date.now() - startTime,
      )

      return NextResponse.json({
        success: true,
        config,
      })
    } catch (fileError) {
      const err = fileError as NodeJS.ErrnoException
      if (err.code === 'ENOENT') {
        // Config file doesn't exist, return default config
        const defaultConfig: PluginConfig = {
          pluginName: name,
          settings: {},
          envVars: {},
          enabled: true,
        }

        return NextResponse.json({
          success: true,
          config: defaultConfig,
          isDefault: true,
        })
      }
      throw fileError
    }
  } catch (error) {
    const err = error as { message?: string }
    logger.error('Failed to read plugin config', { name, error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to read plugin configuration',
        details: err.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
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

    const body = await request.json()
    const { settings, envVars, webhookUrl, syncInterval, enabled } = body

    const configPath = getPluginConfigPath(name)
    const configDir = path.dirname(configPath)

    // Ensure config directory exists
    await fs.mkdir(configDir, { recursive: true })

    // Read existing config or create new one
    let existingConfig: PluginConfig = {
      pluginName: name,
      settings: {},
      envVars: {},
      enabled: true,
    }

    try {
      const configData = await fs.readFile(configPath, 'utf-8')
      existingConfig = JSON.parse(configData)
    } catch (_readError) {
      // Config doesn't exist, use defaults
    }

    // Update config with new values
    const updatedConfig: PluginConfig = {
      ...existingConfig,
      pluginName: name,
      settings:
        settings !== undefined
          ? { ...existingConfig.settings, ...settings }
          : existingConfig.settings,
      envVars:
        envVars !== undefined
          ? { ...existingConfig.envVars, ...envVars }
          : existingConfig.envVars,
      webhookUrl:
        webhookUrl !== undefined ? webhookUrl : existingConfig.webhookUrl,
      syncInterval:
        syncInterval !== undefined ? syncInterval : existingConfig.syncInterval,
      enabled: enabled !== undefined ? enabled : existingConfig.enabled,
    }

    // Write updated config
    await fs.writeFile(
      configPath,
      JSON.stringify(updatedConfig, null, 2),
      'utf-8',
    )

    logger.info('Updated plugin config', { name })
    logger.api(
      'PUT',
      `/api/plugins/${name}/config`,
      200,
      Date.now() - startTime,
    )

    return NextResponse.json({
      success: true,
      message: `Plugin ${name} configuration updated`,
      config: updatedConfig,
    })
  } catch (error) {
    const err = error as { message?: string }
    logger.error('Failed to update plugin config', { name, error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update plugin configuration',
        details: err.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
