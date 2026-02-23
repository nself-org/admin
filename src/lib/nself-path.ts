import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
 * 1. NSELF_CLI_PATH environment variable (explicit override)
 * 2. nself in PATH (standard installation via curl|bash)
 * 3. Development location ($HOME/Sites/nself/bin/nself)
 * 4. Common installation paths
 */
export async function findNselfPath(): Promise<string> {
  // 1. Check explicit environment variable first
  if (process.env.NSELF_CLI_PATH && fs.existsSync(process.env.NSELF_CLI_PATH)) {
    return process.env.NSELF_CLI_PATH
  }

  // 2. Check if nself is in PATH (most common for users)
  try {
    const enhancedPath = getEnhancedPath()
    const { stdout } = await execAsync('which nself', {
      env: { ...process.env, PATH: enhancedPath },
    })
    const nselfPath = stdout.trim()
    if (nselfPath && fs.existsSync(nselfPath)) {
      return nselfPath
    }
    return 'nself'
  } catch {
    // Not in PATH, continue checking
  }

  // 3. Check development location (for developers)
  const devPath = getDevPath()
  if (fs.existsSync(devPath)) {
    return devPath
  }

  // 4. Check common installation paths
  const commonPaths = getCommonPaths()
  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      return p
    }
  }

  // If not found, default to 'nself' and let it fail with a clear error
  console.warn('nself CLI not found in common locations, defaulting to PATH')
  return 'nself'
}

// Module-level cache for findNselfPathSync().
// execSync('which nself') blocks the Node.js event loop for the duration of
// the shell command.  Multiple concurrent API requests that each call
// findNselfPathSync() would cause N sequential event-loop blockages.
// Caching the result after the first resolution ensures only ONE blocking
// execSync runs per server-process lifetime — all subsequent calls are instant.
let _nselfPathSyncCache: string | null = null

/**
 * Synchronous version for use in API routes.
 * Result is cached for the process lifetime to avoid repeated execSync blocking.
 */
export function findNselfPathSync(): string {
  if (_nselfPathSyncCache !== null) return _nselfPathSyncCache

  // 1. Check explicit environment variable first
  if (process.env.NSELF_CLI_PATH && fs.existsSync(process.env.NSELF_CLI_PATH)) {
    _nselfPathSyncCache = process.env.NSELF_CLI_PATH
    return _nselfPathSyncCache
  }

  // 2. Check if nself is in PATH (one-time blocking execSync — cached after this)
  try {
    const enhancedPath = getEnhancedPath()
    const result = require('child_process').execSync('which nself', {
      encoding: 'utf-8',
      env: { ...process.env, PATH: enhancedPath },
    })
    const nselfPath = result.trim()
    if (nselfPath && fs.existsSync(nselfPath)) {
      _nselfPathSyncCache = nselfPath
      return _nselfPathSyncCache
    }
    _nselfPathSyncCache = 'nself'
    return _nselfPathSyncCache
  } catch {
    // Not in PATH, continue checking
  }

  // 3. Check development location
  const devPath = getDevPath()
  if (fs.existsSync(devPath)) {
    _nselfPathSyncCache = devPath
    return _nselfPathSyncCache
  }

  // 4. Check common installation paths
  const commonPaths = getCommonPaths()
  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      _nselfPathSyncCache = p
      return _nselfPathSyncCache
    }
  }

  // Default to 'nself' and let it fail with a clear error
  _nselfPathSyncCache = 'nself'
  return _nselfPathSyncCache
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
