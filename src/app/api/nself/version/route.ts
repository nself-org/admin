import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { exec } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Parse the version string from `nself --version` output.
 *
 * Preserves the `v` prefix when present (e.g. "v1.0.13", "v1.2.3-rc.1").
 * If the CLI emits a bare version without the `v` prefix, the matched bare
 * semver is returned. If neither pattern matches, the trimmed raw stdout is
 * returned so we never silently drop information.
 *
 * Examples:
 *   "nself version v1.0.13"        -> "v1.0.13"
 *   "nself version v1.2.3-rc.1"    -> "v1.2.3-rc.1"
 *   "nself version v1.0.0+build.5" -> "v1.0.0+build.5"
 *   "nself version 0.4.4"          -> "0.4.4"
 *
 * NOTE: not exported because Next.js App Router route files may only export
 * route handlers (GET/POST/etc.) and a small allowlist of route metadata.
 * Tests exercise this logic by driving GET() with mocked exec output.
 */
function parseVersion(stdout: string): string {
  // Match a version with the `v` prefix and capture it including the `v`.
  // Supports semver core (X.Y.Z) plus optional pre-release (-rc.1) and
  // build metadata (+build.5).
  const prefixed = stdout.match(/(v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)*)/)
  if (prefixed) {
    return prefixed[1]
  }

  // Fallback: bare version without the `v` prefix.
  const bare = stdout.match(/version\s+(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)*)/)
  if (bare) {
    return bare[1]
  }

  return stdout.trim()
}

export async function GET(): Promise<NextResponse> {
  try {
    const nselfCommand = await findNselfPath()

    // Get version from nself CLI
    const { stdout } = await execAsync(`${nselfCommand} --version`, {
      env: {
        ...process.env,
        PATH: getEnhancedPath(),
      },
      timeout: 5000,
    })

    // Parse version from output (e.g., "nself version v1.0.13")
    // Preserves the `v` prefix so the UI displays "v1.0.13", not "1.0.13".
    const version = parseVersion(stdout)

    return NextResponse.json({
      version,
      path: nselfCommand,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'nself CLI not found',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 404 },
    )
  }
}
