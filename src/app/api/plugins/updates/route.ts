/**
 * Plugin Updates API Route
 *
 * GET /api/plugins/updates
 *   Returns the list of installed plugins that have a newer version available
 *   in the registry. The Admin UI polls this endpoint every N minutes and
 *   toasts when `updates.length > 0`.
 *
 * Response shape:
 *   {
 *     success: true,
 *     updates: [
 *       { name: "ai", installed: "1.1.0", latest: "1.1.1", tier: "pro" }
 *     ],
 *     checkedAt: ISO-8601
 *   }
 */

import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

const REGISTRY_MANIFEST_URL = 'https://plugins.nself.org/manifest.json'

interface InstalledPlugin {
  name: string
  version: string
  tier?: string
}

interface ManifestEntry {
  name: string
  version: string
  tier?: string
}

interface AvailableUpdate {
  name: string
  installed: string
  latest: string
  tier: string
}

// Tiny semver-aware comparator. Returns 1 if a > b, -1 if a < b, 0 if equal.
// Falls back to string compare when segments aren't numeric.
function compareVersions(a: string, b: string): number {
  const clean = (v: string) => v.replace(/^v/, '').split(/[.+-]/)
  const aParts = clean(a)
  const bParts = clean(b)
  const len = Math.max(aParts.length, bParts.length)
  for (let i = 0; i < len; i++) {
    const aSeg = aParts[i] ?? '0'
    const bSeg = bParts[i] ?? '0'
    const aNum = Number(aSeg)
    const bNum = Number(bSeg)
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      if (aNum > bNum) return 1
      if (aNum < bNum) return -1
    } else {
      if (aSeg > bSeg) return 1
      if (aSeg < bSeg) return -1
    }
  }
  return 0
}

async function fetchManifest(): Promise<ManifestEntry[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(REGISTRY_MANIFEST_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'nself-admin' },
    })
    clearTimeout(timeoutId)
    if (!response.ok) {
      logger.warn('Registry manifest fetch failed', { status: response.status })
      return []
    }
    const data = await response.json()
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.plugins)
        ? data.plugins
        : []
  } catch (err) {
    clearTimeout(timeoutId)
    const e = err as { message?: string }
    logger.warn('Registry manifest fetch errored', { error: e.message })
    return []
  }
}

async function fetchInstalled(): Promise<InstalledPlugin[]> {
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const { stdout } = await execAsync(
      `${nselfPath} plugin list --installed --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 30000,
      },
    )
    const parsed = JSON.parse(stdout.trim())
    const list = Array.isArray(parsed) ? parsed : parsed.plugins || []
    return list.map((p: { name: string; version?: string; tier?: string }) => ({
      name: p.name,
      version: p.version || '0.0.0',
      tier: p.tier,
    }))
  } catch (err) {
    const e = err as { message?: string }
    logger.warn('Installed plugin list fetch failed', { error: e.message })
    return []
  }
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const [manifest, installed] = await Promise.all([
      fetchManifest(),
      fetchInstalled(),
    ])

    const latestByName = new Map<string, ManifestEntry>()
    for (const entry of manifest) {
      if (entry && entry.name) {
        latestByName.set(entry.name, entry)
      }
    }

    const updates: AvailableUpdate[] = []
    for (const plugin of installed) {
      const latest = latestByName.get(plugin.name)
      if (!latest || !latest.version) continue
      if (compareVersions(latest.version, plugin.version) > 0) {
        updates.push({
          name: plugin.name,
          installed: plugin.version,
          latest: latest.version,
          tier: plugin.tier || latest.tier || 'free',
        })
      }
    }

    logger.api('GET', '/api/plugins/updates', 200, Date.now() - startTime)

    return NextResponse.json(
      {
        success: true,
        updates,
        count: updates.length,
        checkedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'max-age=300',
        },
      },
    )
  } catch (err) {
    const e = err as { message?: string }
    logger.error('Update check failed', { error: e.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check for plugin updates',
        details: e.message || 'Unknown error',
      },
      { status: 500 },
    )
  }
}
