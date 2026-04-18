/**
 * Plugin Install/Uninstall API Route (per-plugin)
 * POST: Install a specific plugin (with license check for pro plugins)
 * DELETE: Uninstall a specific plugin
 */

import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/** Strict plugin name validation: lowercase alphanumeric + hyphens only */
const PLUGIN_NAME_RE = /^[a-z0-9-]+$/

interface RouteContext {
  params: Promise<{ name: string }>
}

interface PluginMetadata {
  tier?: string
  licenseRequired?: boolean
}

interface LicenseValidateResponse {
  valid?: boolean
  tier?: string
}

/** Fetch plugin metadata from the public registry. Returns null on error. */
async function fetchPluginMeta(
  pluginName: string,
): Promise<PluginMetadata | null> {
  try {
    const res = await fetch(
      `https://plugins.nself.org/plugins/${encodeURIComponent(pluginName)}`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return null
    return (await res.json()) as PluginMetadata
  } catch {
    return null
  }
}

/** Validate a license key against ping.nself.org. Returns false on any error. */
async function validateLicenseKey(licenseKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://ping.nself.org/license/validate', {
      headers: { Authorization: `Bearer ${licenseKey}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return false
    const data = (await res.json()) as LicenseValidateResponse
    return data.valid === true
  } catch {
    return false
  }
}

export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const startTime = Date.now()
  const { name } = await context.params

  // Strict name validation — must match ^[a-z0-9-]+$ only
  if (!PLUGIN_NAME_RE.test(name)) {
    return NextResponse.json(
      { success: false, error: 'Invalid plugin name format' },
      { status: 400 },
    )
  }

  try {
    // Check plugin metadata to determine if a license is required
    const meta = await fetchPluginMeta(name)
    const isPro = meta?.tier === 'pro' || meta?.licenseRequired === true

    if (isPro) {
      const licenseKey = process.env.NSELF_PLUGIN_LICENSE_KEY
      if (!licenseKey) {
        logger.warn('Pro plugin install blocked — no license key configured', {
          name,
        })
        return NextResponse.json(
          {
            success: false,
            error: 'License required',
            licenseRequired: true,
            upgradeUrl: 'https://nself.org/pricing',
          },
          { status: 402 },
        )
      }

      const isValid = await validateLicenseKey(licenseKey)
      if (!isValid) {
        logger.warn('Pro plugin install blocked — license key invalid', {
          name,
        })
        return NextResponse.json(
          {
            success: false,
            error: 'License required',
            licenseRequired: true,
            upgradeUrl: 'https://nself.org/pricing',
          },
          { status: 402 },
        )
      }
    }

    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    logger.info('Installing plugin', { name, pro: isPro })

    const { stdout, stderr } = await execFileAsync(
      nselfPath,
      ['plugin', 'install', name],
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 120000,
      },
    )

    logger.cli(`plugin install ${name}`, true, Date.now() - startTime)
    logger.api(
      'POST',
      `/api/plugins/${name}/install`,
      200,
      Date.now() - startTime,
    )

    return NextResponse.json({
      success: true,
      name,
      message: 'Plugin installed',
      output: stdout || stderr,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to install plugin', { name, error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Installation failed',
        details: err.message ?? 'Unknown error',
        output: err.stdout ?? err.stderr,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const startTime = Date.now()
  const { name } = await context.params

  // Strict name validation — must match ^[a-z0-9-]+$ only
  if (!PLUGIN_NAME_RE.test(name)) {
    return NextResponse.json(
      { success: false, error: 'Invalid plugin name format' },
      { status: 400 },
    )
  }

  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    logger.info('Removing plugin', { name })

    const { stdout, stderr } = await execFileAsync(
      nselfPath,
      ['plugin', 'remove', name],
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    logger.cli(`plugin remove ${name}`, true, Date.now() - startTime)
    logger.api(
      'DELETE',
      `/api/plugins/${name}/install`,
      200,
      Date.now() - startTime,
    )

    return NextResponse.json({
      success: true,
      name,
      message: 'Plugin removed',
      output: stdout || stderr,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to remove plugin', { name, error: err.message })

    return NextResponse.json(
      {
        success: false,
        error: 'Removal failed',
        details: err.message ?? 'Unknown error',
        output: err.stdout ?? err.stderr,
      },
      { status: 500 },
    )
  }
}
