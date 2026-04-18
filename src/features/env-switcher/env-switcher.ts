/**
 * Core logic for the env-switcher feature.
 * All CLI interactions are server-side only — this module is imported exclusively
 * from API routes, never from client components.
 *
 * CLI contract:
 *   nself env show   → prints active env name on stdout (e.g. "local")
 *   nself env list   → prints one env name per line
 *   nself env use <target> → switches active env, exits 0 on success
 */

import { getEnhancedPath } from '@/lib/nself-path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { EnvSwitcherError, EnvSwitchResult, EnvTarget } from './types'

const execFileAsync = promisify(execFile)

/** The exhaustive set of valid env targets. */
const VALID_TARGETS: ReadonlySet<string> = new Set(['local', 'staging', 'prod'])

/** Timeout for env CLI commands (ms). */
const CLI_TIMEOUT_MS = 15_000

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function makeEnvSwitcherError(
  message: string,
  code: EnvSwitcherError['code'],
  details?: string,
): EnvSwitcherError {
  const err = new Error(message) as EnvSwitcherError
  err.code = code
  err.details = details
  return err
}

function assertValidTarget(value: string): asserts value is EnvTarget {
  if (!VALID_TARGETS.has(value)) {
    throw makeEnvSwitcherError(
      `Invalid env target: "${value}". Must be one of: local, staging, prod`,
      'INVALID_TARGET',
    )
  }
}

function buildExecEnv(): NodeJS.ProcessEnv {
  return { ...process.env, PATH: getEnhancedPath() }
}

/**
 * Run a `nself env <subcommand>` call and return stdout.
 * Throws EnvSwitcherError on failure.
 */
async function runEnvCommand(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('nself', ['env', ...args], {
      env: buildExecEnv(),
      timeout: CLI_TIMEOUT_MS,
    })
    return stdout.trim()
  } catch (err) {
    const execErr = err as { message?: string; stderr?: string; code?: string }
    if (execErr.code === 'ENOENT') {
      throw makeEnvSwitcherError(
        'nself CLI not found. Ensure nself is installed and on PATH.',
        'CLI_NOT_FOUND',
        execErr.message,
      )
    }
    throw makeEnvSwitcherError(
      `nself env ${args.join(' ')} failed`,
      'SWITCH_FAILED',
      execErr.stderr ?? execErr.message,
    )
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the currently active environment by running `nself env show`.
 * Falls back to 'local' when the CLI returns an unrecognised or empty value.
 */
export async function getCurrentEnv(): Promise<EnvTarget> {
  const raw = await runEnvCommand(['show'])

  // `nself env show` may print "current: local" or just "local"
  // Normalise: extract the last whitespace-delimited token
  const token = raw.split(/\s+/).pop() ?? ''
  const normalised = token.toLowerCase().trim()

  if (VALID_TARGETS.has(normalised)) {
    return normalised as EnvTarget
  }

  // Unmapped value — default to local rather than crashing
  return 'local'
}

/**
 * Returns the list of available environments by running `nself env list`.
 * Only returns targets that match the known set (local | staging | prod).
 */
export async function listEnvs(): Promise<EnvTarget[]> {
  const raw = await runEnvCommand(['list'])

  const lines = raw
    .split('\n')
    .map((l) => l.trim().toLowerCase())
    .filter((l) => VALID_TARGETS.has(l)) as EnvTarget[]

  // Always guarantee at least 'local' is present
  if (!lines.includes('local')) {
    lines.unshift('local')
  }

  // De-duplicate while preserving order
  return [...new Set(lines)]
}

/**
 * Switches the active environment to `target` by running `nself env use <target>`.
 * The caller is responsible for any confirmation UX before invoking this function.
 */
export async function switchEnv(target: EnvTarget): Promise<EnvSwitchResult> {
  assertValidTarget(target)

  // Capture previous env before switching
  let previous: EnvTarget = 'local'
  try {
    previous = await getCurrentEnv()
  } catch {
    // Best-effort — if show fails, assume local as baseline
  }

  try {
    await runEnvCommand(['use', target])
  } catch (err) {
    const switchErr = err as EnvSwitcherError
    return {
      success: false,
      previous,
      current: previous,
      message: switchErr.message ?? `Failed to switch to ${target}`,
    }
  }

  return {
    success: true,
    previous,
    current: target,
    message: `Switched from ${previous} to ${target}`,
  }
}
