/**
 * Server-side license management for nself-admin.
 * All operations delegate to the `nself license` CLI commands.
 *
 * This module is SERVER-SIDE ONLY. Never import it from a client component.
 */

import { findNselfPathSync, getEnhancedPath } from '@/lib/nself-path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type {
  LicenseError,
  LicenseKey,
  LicenseSetResult,
  LicenseStatus,
  LicenseValidateResult,
} from './types'

const execFileAsync = promisify(execFile)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum valid key length including the nself_ prefix. */
const MIN_KEY_LENGTH = 20

/** Key prefix that all valid nSelf license keys must start with. */
const KEY_PREFIX = 'nself_'

/** Map of key prefix segments to display names. */
const PRODUCT_DISPLAY_NAMES: Record<string, string> = {
  owner: 'ɳSelf Owner',
  plus: 'ɳSelf+',
  claw: 'ɳClaw',
  clawde: 'ClawDE+',
  chat: 'ɳChat',
  media: 'nMedia',
  family: 'nFamily',
  pro: 'ɳSelf Pro',
  ent: 'ɳSelf Enterprise',
  max: 'ɳSelf Business+',
}

/** Tier labels mapped from product slugs. */
const PRODUCT_TIER_LABELS: Record<string, string> = {
  owner: 'Owner',
  plus: 'ɳSelf+',
  claw: 'ɳClaw',
  clawde: 'ClawDE+',
  chat: 'ɳChat',
  media: 'nMedia',
  family: 'nFamily',
  pro: 'Pro',
  ent: 'Enterprise',
  max: 'Business+',
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function makeLicenseError(
  message: string,
  code: LicenseError['code'],
): LicenseError {
  const err = new Error(message) as LicenseError
  err.code = code
  return err
}

/**
 * Runs an nself CLI subcommand and returns stdout.
 * Throws LicenseError with code 'CLI_NOT_FOUND' if the binary is missing.
 * Throws LicenseError with code 'IO_ERROR' on any other execution failure.
 */
async function runNselfCommand(args: string[]): Promise<string> {
  const nselfPath = findNselfPathSync()
  const enhancedPath = getEnhancedPath()

  try {
    const { stdout } = await execFileAsync(nselfPath, args, {
      env: { ...process.env, PATH: enhancedPath },
      timeout: 30_000,
    })
    return stdout.trim()
  } catch (err) {
    const execErr = err as NodeJS.ErrnoException & {
      code?: string | number
      stderr?: string
    }

    // ENOENT means the nself binary was not found at the resolved path.
    if (execErr.code === 'ENOENT') {
      throw makeLicenseError(
        `nself CLI not found at: ${nselfPath}. Install nself and ensure it is on PATH.`,
        'CLI_NOT_FOUND',
      )
    }

    // Non-zero exit from the CLI — surface its stderr if available.
    const detail = execErr.stderr?.trim() ?? execErr.message
    throw makeLicenseError(
      `nself ${args[0] ?? ''} failed: ${detail}`,
      'IO_ERROR',
    )
  }
}

/**
 * Extracts the product slug from a key string.
 * e.g. "nself_pro_xxxx" -> "pro"
 * Returns "unknown" if the key format is unrecognised.
 */
function extractProduct(key: string): string {
  // Keys follow nself_<product>_<secret> pattern.
  const parts = key.split('_')
  // parts[0] === 'nself', parts[1] === product slug, parts[2+] === secret
  if (parts.length >= 3 && parts[0] === 'nself') {
    return parts[1] ?? 'unknown'
  }
  return 'unknown'
}

/**
 * Parses a line of `nself license status` output that lists plugin names.
 * The CLI emits lines like:
 *   Plugins: ai, mux, claw, voice
 * or
 *   Plugins covered: ai mux claw
 * This function normalises both comma-separated and space-separated lists.
 */
function parsePluginList(line: string): string[] {
  const afterColon = line.split(':').slice(1).join(':').trim()
  if (!afterColon) return []
  return afterColon
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

/**
 * Parses the human-readable output of `nself license status` into LicenseStatus.
 *
 * The CLI output format (best-effort text parse):
 *
 *   License Status
 *   ==============
 *   Key: nself_pro_••••••••••••••••••••••••••••••••
 *   Product: pro
 *   Tier: Pro
 *   Plugins: ai, mux, voice, ...
 *   Expires: never | 2026-12-31
 *   Valid: yes | no
 *
 * Multiple keys are separated by blank lines. The footer may include:
 *   Active Tier: Pro
 *   Plugins Covered: ai, mux, ...
 */
function parseStatusOutput(raw: string): LicenseStatus {
  if (!raw || raw.trim().length === 0) {
    return {
      keys: [],
      activeTier: 'Free',
      pluginsCovered: [],
      hasLicense: false,
    }
  }

  const lines = raw.split('\n')
  const keys: LicenseKey[] = []

  let currentKey: Partial<LicenseKey> | null = null
  let activeTier = 'Free'
  let pluginsCovered: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()

    // Section header / separator — skip
    if (
      line.startsWith('=') ||
      line.startsWith('-') ||
      line === 'License Status'
    ) {
      continue
    }

    // Blank line between key blocks
    if (line === '') {
      if (currentKey?.key) {
        keys.push(buildLicenseKey(currentKey))
        currentKey = null
      }
      continue
    }

    // Footer: aggregate fields
    if (line.toLowerCase().startsWith('active tier:')) {
      activeTier = line.split(':').slice(1).join(':').trim() || 'Free'
      continue
    }

    if (line.toLowerCase().startsWith('plugins covered:')) {
      pluginsCovered = parsePluginList(line)
      continue
    }

    // Key block fields
    if (line.toLowerCase().startsWith('key:')) {
      if (currentKey?.key) {
        keys.push(buildLicenseKey(currentKey))
      }
      currentKey = { key: line.split(':').slice(1).join(':').trim() }
      continue
    }

    if (!currentKey) continue

    if (line.toLowerCase().startsWith('product:')) {
      currentKey.product = line
        .split(':')
        .slice(1)
        .join(':')
        .trim()
        .toLowerCase()
      continue
    }

    if (line.toLowerCase().startsWith('tier:')) {
      currentKey.tier = line.split(':').slice(1).join(':').trim()
      continue
    }

    if (line.toLowerCase().startsWith('plugins:')) {
      currentKey.plugins = parsePluginList(line)
      continue
    }

    if (line.toLowerCase().startsWith('expires:')) {
      const val = line.split(':').slice(1).join(':').trim().toLowerCase()
      currentKey.expiresAt = val === 'never' || val === '' ? null : val
      continue
    }

    if (line.toLowerCase().startsWith('valid:')) {
      const val = line.split(':').slice(1).join(':').trim().toLowerCase()
      currentKey.valid = val === 'yes' || val === 'true'
      continue
    }
  }

  // Flush last key block
  if (currentKey?.key) {
    keys.push(buildLicenseKey(currentKey))
  }

  const hasLicense = keys.length > 0 && keys.some((k) => k.valid)

  return {
    keys,
    activeTier,
    pluginsCovered,
    hasLicense,
  }
}

/**
 * Fills in derived fields (displayName, tier) for a parsed key block.
 */
function buildLicenseKey(partial: Partial<LicenseKey>): LicenseKey {
  const product = partial.product ?? extractProduct(partial.key ?? '')
  return {
    key: partial.key ?? '',
    product,
    displayName: PRODUCT_DISPLAY_NAMES[product] ?? product,
    tier: partial.tier ?? PRODUCT_TIER_LABELS[product] ?? product,
    plugins: partial.plugins ?? [],
    expiresAt: partial.expiresAt ?? null,
    valid: partial.valid ?? false,
  }
}

/**
 * Parses the output of `nself license validate` into LicenseValidateResult.
 * Handles both success and error output formats.
 */
function parseValidateOutput(raw: string): LicenseValidateResult {
  const lines = raw.split('\n')
  let valid = false
  let tier = 'Unknown'
  let plugins: string[] = []
  let expiresAt: string | null = null
  let message = raw.trim()

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line.toLowerCase().startsWith('valid:')) {
      const val = line.split(':').slice(1).join(':').trim().toLowerCase()
      valid = val === 'yes' || val === 'true'
      continue
    }

    if (line.toLowerCase().startsWith('tier:')) {
      tier = line.split(':').slice(1).join(':').trim() || 'Unknown'
      continue
    }

    if (line.toLowerCase().startsWith('plugins:')) {
      plugins = parsePluginList(line)
      continue
    }

    if (line.toLowerCase().startsWith('expires:')) {
      const val = line.split(':').slice(1).join(':').trim().toLowerCase()
      expiresAt = val === 'never' || val === '' ? null : val
      continue
    }

    if (
      line.toLowerCase().startsWith('status:') ||
      line.toLowerCase().startsWith('message:')
    ) {
      message = line.split(':').slice(1).join(':').trim()
      continue
    }
  }

  return { valid, tier, plugins, expiresAt, message }
}

/**
 * Parses the output of `nself license set <key>` into LicenseSetResult.
 */
function parseSetOutput(raw: string, key: string): LicenseSetResult {
  const product = extractProduct(key)
  const success =
    !raw.toLowerCase().includes('error') &&
    !raw.toLowerCase().includes('failed')
  return { success, product, message: raw.trim() }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the current license status by running `nself license status`.
 * Returns a zero-license status (hasLicense: false) when no keys are configured.
 */
export async function getLicenseStatus(): Promise<LicenseStatus> {
  try {
    const output = await runNselfCommand(['license', 'status'])
    return parseStatusOutput(output)
  } catch (err) {
    const licErr = err as LicenseError
    // CLI_NOT_FOUND is a hard error — propagate so callers can show a clear warning.
    if (licErr.code === 'CLI_NOT_FOUND') throw err
    // Any other error (e.g. no key configured) -> return empty status gracefully.
    return {
      keys: [],
      activeTier: 'Free',
      pluginsCovered: [],
      hasLicense: false,
    }
  }
}

/**
 * Saves a license key by running `nself license set <key>`.
 * Validates key format before invoking the CLI.
 * Throws LicenseError with code 'INVALID_KEY' on format rejection.
 */
export async function setLicenseKey(key: string): Promise<LicenseSetResult> {
  if (!key.startsWith(KEY_PREFIX) || key.length < MIN_KEY_LENGTH) {
    throw makeLicenseError(
      `Invalid key format. Keys must start with "${KEY_PREFIX}" and be at least ${MIN_KEY_LENGTH} characters.`,
      'INVALID_KEY',
    )
  }

  const output = await runNselfCommand(['license', 'set', key])
  return parseSetOutput(output, key)
}

/**
 * Validates the current license against ping.nself.org by running
 * `nself license validate`. Throws LicenseError on CLI or network failure.
 */
export async function validateLicenseKey(): Promise<LicenseValidateResult> {
  try {
    const output = await runNselfCommand(['license', 'validate'])
    return parseValidateOutput(output)
  } catch (err) {
    const licErr = err as LicenseError
    if (licErr.code === 'CLI_NOT_FOUND') throw err
    throw makeLicenseError(
      `Validation failed: ${licErr.message}`,
      'VALIDATE_FAILED',
    )
  }
}

/**
 * Removes all configured license keys by running `nself license clear`.
 * Throws LicenseError with code 'CLEAR_FAILED' on failure.
 */
export async function clearLicenseKeys(): Promise<void> {
  try {
    await runNselfCommand(['license', 'clear'])
  } catch (err) {
    const licErr = err as LicenseError
    if (licErr.code === 'CLI_NOT_FOUND') throw err
    throw makeLicenseError(
      `Failed to clear license keys: ${licErr.message}`,
      'CLEAR_FAILED',
    )
  }
}
