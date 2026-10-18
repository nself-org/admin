import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * NSELF_BIN: absolute path of the nself binary to run, ahead of all discovery.
 * The cli compat check (scripts/cli-compat.sh) and tests point it at a build of
 * cli main. A value that does not exist on disk is ignored with a warning, so a
 * typo never silently runs a different binary than the one named.
 */
export function getNselfBinOverride(): string | null {
  const bin = process.env.NSELF_BIN
  if (!bin) return null
  if (fs.existsSync(bin)) return bin
  console.warn(`NSELF_BIN is set but does not exist (${bin}); falling back to discovery`)
  return null
}

/**
 * Admin parses the pre-envelope JSON of cli 1.4 everywhere. From cli 1.5 the
 * default `--json` shape is the v1 envelope; NSELF_JSON_LEGACY=1 keeps the bare
 * shape for one minor release. Setting it once on the process reaches the
 * helpers in nselfCLI.ts and every route that spawns the binary found by
 * findNselfPath*, because those inherit process.env. An explicit value (for
 * example NSELF_JSON_LEGACY=0 in a test of the envelope) is never overwritten.
 */
export function ensureLegacyJsonEnv(): void {
  if (process.env.NSELF_JSON_LEGACY === undefined) {
    process.env.NSELF_JSON_LEGACY = '1'
  }
}

/**
 * Child environment for an nself invocation: process env, the enhanced PATH,
 * NSELF_JSON_LEGACY=1 unless set, then the caller's extras (which win).
 */
export function getNselfChildEnv(
  extra: Record<string, string | undefined> = {}
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: getEnhancedPath(),
    NSELF_JSON_LEGACY: process.env.NSELF_JSON_LEGACY ?? '1',
    ...extra,
  }
}

/**
 * Get the nself CLI development path from environment or derive from HOME
 * Supports NSELF_CLI_PATH env var for explicit override
 * Handles both container and local development environments
 */
function getDevPath(): string {
  // Allow explicit override via environment variable
  if (process.env.NSELF_CLI_PATH) {
    return process.env.NSELF_CLI_PATH
  }

  // In production container, nself is at /usr/local/bin/nself (symlink to /opt/nself)
  if (process.env.NODE_ENV === 'production') {
    return '/usr/local/bin/nself'
  }

  // For local development, check HOME directory
  const home = process.env.HOME || '/root'
  return path.join(home, 'Sites', 'nself', 'bin', 'nself')
}

/**
 * Get common installation paths for nself CLI
 * Priority: Container paths first (for production), then local development paths
 */
function getCommonPaths(): string[] {
  const home = process.env.HOME || '/root'
  return [
    // Container paths (priority for production)
    '/usr/local/bin/nself', // Container symlink
    '/opt/nself/bin/nself', // Alternative container location
    '/opt/nself/src/cli/nself.sh', // Direct script path in container
    // macOS/Linux standard paths
    '/opt/homebrew/bin/nself', // macOS Homebrew
    path.join(home, 'bin', 'nself'), // User local bin
    path.join(home, '.local', 'bin', 'nself'), // User local bin (Linux)
    path.join(home, '.nself', 'bin', 'nself'), // nself-specific directory
    '/usr/bin/nself', // System bin
  ]
}

/**
 * Find the nself CLI executable
 * Priority order:
 * 0. NSELF_BIN environment variable (test and compat-check seam, see getNselfBinOverride)
 * 1. NSELF_CLI_PATH environment variable (explicit override)
 * 2. Development location ($HOME/Sites/nself/bin/nself)
 * 3. Common installation paths (container + system + user)
 * 4. nself in PATH via which — last resort for non-standard installs
 */
export async function findNselfPath(): Promise<string> {
  ensureLegacyJsonEnv()

  // 0. NSELF_BIN beats every discovery step
  const binOverride = getNselfBinOverride()
  if (binOverride) {
    return binOverride
  }

  // 1. Check explicit environment variable first
  if (process.env.NSELF_CLI_PATH && fs.existsSync(process.env.NSELF_CLI_PATH)) {
    return process.env.NSELF_CLI_PATH
  }

  // 2. Check development location (for developers)
  const devPath = getDevPath()
  if (fs.existsSync(devPath)) {
    return devPath
  }

  // 3. Check common installation paths
  const commonPaths = getCommonPaths()
  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      return p
    }
  }

  // 4. Last resort: check PATH via which (async, won't block event loop)
  try {
    const enhancedPath = getEnhancedPath()
    const { stdout } = await execAsync('which nself', {
      env: { ...process.env, PATH: enhancedPath },
    })
    const nselfPath = stdout.trim()
    if (nselfPath && fs.existsSync(nselfPath)) {
      return nselfPath
    }
  } catch {
    // Not in PATH
  }

  // If not found, default to 'nself' and let it fail with a clear error
  console.warn('nself CLI not found in common locations, defaulting to PATH')
  return 'nself'
}

// Module-level cache for findNselfPathSync().
// Static path checks (fs.existsSync) are fast (<1ms each) and run first.
// execSync('which nself') is a LAST RESORT — it blocks the Node.js event loop
// for the duration of the shell command, and on CI (Linux, nself not installed)
// searching through a long enhanced PATH can take several seconds per call.
// In Next.js dev mode each API route bundle has its own module instance, so
// this cache is per-bundle — but the reordering ensures that in CI environments
// where nself is not installed, we never call execSync at all.
let _nselfPathSyncCache: string | null = null

/**
 * Synchronous version for use in API routes.
 * Priority order (fast static checks first, slow shell lookup last):
 * 0. NSELF_BIN environment variable (checked before the cache, so it can change between calls)
 * 1. NSELF_CLI_PATH environment variable (explicit override)
 * 2. Development location ($HOME/Sites/nself/bin/nself)
 * 3. Common installation paths (container + system + user)
 * 4. nself in PATH via execSync — last resort, only when static checks all fail
 *
 * This ordering ensures CI environments (nself not installed anywhere) skip the
 * blocking execSync entirely, preventing event-loop stalls during E2E tests.
 */
export function findNselfPathSync(): string {
  ensureLegacyJsonEnv()

  const binOverride = getNselfBinOverride()
  if (binOverride) return binOverride

  if (_nselfPathSyncCache !== null) return _nselfPathSyncCache

  // 1. Check explicit environment variable first
  if (process.env.NSELF_CLI_PATH && fs.existsSync(process.env.NSELF_CLI_PATH)) {
    const p = process.env.NSELF_CLI_PATH
    _nselfPathSyncCache = p
    return p
  }

  // 2. Check development location (fast fs.existsSync — no shell spawn)
  const devPath = getDevPath()
  if (fs.existsSync(devPath)) {
    _nselfPathSyncCache = devPath
    return devPath
  }

  // 3. Check common installation paths (fast fs.existsSync — no shell spawn)
  const commonPaths = getCommonPaths()
  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      _nselfPathSyncCache = p
      return p
    }
  }

  // 4. Last resort: check PATH via execSync (blocks event loop — only reached
  //    when nself is in a non-standard PATH location not covered above).
  //    In CI where nself is not installed, this branch is never reached.
  try {
    const enhancedPath = getEnhancedPath()
    const result = require('child_process').execSync('which nself', {
      encoding: 'utf-8',
      env: { ...process.env, PATH: enhancedPath },
    })
    const nselfPath = result.trim()
    if (nselfPath && fs.existsSync(nselfPath)) {
      _nselfPathSyncCache = nselfPath
      return nselfPath
    }
  } catch {
    // Not in PATH
  }

  // Default to 'nself' and let it fail with a clear error
  console.warn('nself CLI not found in common locations, defaulting to PATH')
  _nselfPathSyncCache = 'nself'
  return 'nself'
}

/**
 * Get the PATH environment with common binary locations included
 * This ensures nself and other tools can be found during command execution
 * Includes both container and local development paths
 */
export function getEnhancedPath(): string {
  const home = process.env.HOME || '/root'
  const additionalPaths = [
    // Container paths (priority for production)
    '/usr/local/bin', // Standard container bin (nself symlink here)
    '/opt/nself/bin', // nself CLI directory in container
    // macOS/Linux paths
    '/opt/homebrew/bin',
    '/opt/homebrew/opt/coreutils/libexec/gnubin',
    path.join(home, 'bin'),
    path.join(home, '.local', 'bin'),
    path.join(home, '.nself', 'bin'),
  ]
  const currentPath = process.env.PATH || '/usr/bin:/bin'
  return [...additionalPaths, currentPath].join(':')
}
