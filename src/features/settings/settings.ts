/**
 * Server-side settings management for nself-admin.
 * Persists AdminSettings to {projectPath}/.nself/admin-settings.json
 *
 * All writes are atomic: write to a temp file then rename.
 * Credential values are NEVER logged — callers must not log the return values
 * of loadSettings() or updateCredential().
 */

import fs from 'fs/promises'
import path from 'path'
import type {
  AdminSettings,
  CredentialEntry,
  SettingsError,
  Theme,
} from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Regex for valid env var key names. */
const ENV_KEY_RE = /^[A-Z_][A-Z0-9_]{0,127}$/

/** File name stored inside the project's .nself directory. */
const SETTINGS_FILE = 'admin-settings.json'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function makeSettingsError(
  message: string,
  code: SettingsError['code'],
  details?: string,
): SettingsError {
  const err = new Error(message) as SettingsError
  err.code = code
  err.details = details
  return err
}

function assertValidKey(key: string): void {
  if (!ENV_KEY_RE.test(key)) {
    throw makeSettingsError(
      `Invalid key "${key}". Must match /^[A-Z_][A-Z0-9_]{0,127}$/`,
      'INVALID_KEY',
    )
  }
}

// ---------------------------------------------------------------------------
// Public: path utilities
// ---------------------------------------------------------------------------

/**
 * Returns the absolute path to the settings file for a given project.
 */
export function getSettingsPath(projectPath: string): string {
  return path.join(projectPath, '.nself', SETTINGS_FILE)
}

// ---------------------------------------------------------------------------
// Public: defaults
// ---------------------------------------------------------------------------

/**
 * Returns a fresh AdminSettings object with sensible defaults.
 */
export function getDefaultSettings(): AdminSettings {
  return {
    version: 1,
    credentials: [],
    pluginKeys: [],
    envVars: {},
    telemetry: {
      enabled: true,
    },
    theme: 'dark',
    shortcuts: [
      { action: 'open-command-palette', keys: 'ctrl+k' },
      { action: 'toggle-sidebar', keys: 'ctrl+b' },
      { action: 'go-to-services', keys: 'g s' },
      { action: 'go-to-logs', keys: 'g l' },
      { action: 'go-to-settings', keys: 'g ,' },
    ],
  }
}

// ---------------------------------------------------------------------------
// Public: load / save
// ---------------------------------------------------------------------------

/**
 * Reads admin-settings.json for the given project.
 * Returns default settings if the file is missing or cannot be parsed.
 * Throws SettingsError only on unexpected I/O failures.
 */
export async function loadSettings(
  projectPath: string,
): Promise<AdminSettings> {
  const filePath = getSettingsPath(projectPath)

  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf-8')
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException
    if (nodeErr.code === 'ENOENT') {
      return getDefaultSettings()
    }
    throw makeSettingsError(
      `Failed to read settings file: ${filePath}`,
      'IO_ERROR',
      nodeErr.message,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    const parseErr = err as Error
    throw makeSettingsError(
      'Settings file contains invalid JSON',
      'PARSE_ERROR',
      parseErr.message,
    )
  }

  // Merge with defaults to handle any missing fields from older versions.
  const defaults = getDefaultSettings()
  const data = parsed as Partial<AdminSettings>

  return {
    version: 1,
    credentials: Array.isArray(data.credentials)
      ? data.credentials
      : defaults.credentials,
    pluginKeys: Array.isArray(data.pluginKeys)
      ? data.pluginKeys
      : defaults.pluginKeys,
    envVars:
      data.envVars !== null &&
      typeof data.envVars === 'object' &&
      !Array.isArray(data.envVars)
        ? (data.envVars as Record<string, string>)
        : defaults.envVars,
    telemetry:
      data.telemetry !== null && typeof data.telemetry === 'object'
        ? {
            enabled:
              typeof data.telemetry.enabled === 'boolean'
                ? data.telemetry.enabled
                : defaults.telemetry.enabled,
            anonymousId: data.telemetry.anonymousId,
          }
        : defaults.telemetry,
    theme:
      data.theme === 'dark' || data.theme === 'system'
        ? data.theme
        : defaults.theme,
    shortcuts: Array.isArray(data.shortcuts)
      ? data.shortcuts
      : defaults.shortcuts,
  }
}

/**
 * Atomically writes AdminSettings to disk.
 * Uses write-to-tmp + rename to avoid partial writes.
 */
export async function saveSettings(
  projectPath: string,
  settings: AdminSettings,
): Promise<void> {
  const filePath = getSettingsPath(projectPath)
  const dir = path.dirname(filePath)
  const tmpPath = `${filePath}.tmp`

  // Ensure the .nself directory exists.
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException
    throw makeSettingsError(
      `Failed to create settings directory: ${dir}`,
      'IO_ERROR',
      nodeErr.message,
    )
  }

  const serialised = JSON.stringify(settings, null, 2)

  try {
    await fs.writeFile(tmpPath, serialised, 'utf-8')
    await fs.rename(tmpPath, filePath)
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException
    // Best-effort cleanup of the tmp file.
    await fs.unlink(tmpPath).catch(() => undefined)
    throw makeSettingsError(
      `Failed to save settings to: ${filePath}`,
      'IO_ERROR',
      nodeErr.message,
    )
  }
}

// ---------------------------------------------------------------------------
// Public: credential management
// ---------------------------------------------------------------------------

/**
 * Adds or updates a credential entry.
 * Key must match /^[A-Z_][A-Z0-9_]{0,127}$/.
 */
export async function updateCredential(
  projectPath: string,
  key: string,
  value: string,
  description?: string,
): Promise<void> {
  assertValidKey(key)
  const settings = await loadSettings(projectPath)
  const existing = settings.credentials.findIndex((c) => c.key === key)
  const entry: CredentialEntry = { key, value, description }

  if (existing !== -1) {
    settings.credentials[existing] = entry
  } else {
    settings.credentials.push(entry)
  }

  await saveSettings(projectPath, settings)
}

/**
 * Removes a credential entry by key.
 * No-op if the key does not exist.
 */
export async function removeCredential(
  projectPath: string,
  key: string,
): Promise<void> {
  assertValidKey(key)
  const settings = await loadSettings(projectPath)
  settings.credentials = settings.credentials.filter((c) => c.key !== key)
  await saveSettings(projectPath, settings)
}

// ---------------------------------------------------------------------------
// Public: plugin key management
// ---------------------------------------------------------------------------

/**
 * Adds or updates a plugin key entry.
 * envVar must match /^[A-Z_][A-Z0-9_]{0,127}$/.
 */
export async function updatePluginKey(
  projectPath: string,
  pluginName: string,
  envVar: string,
  value: string,
): Promise<void> {
  assertValidKey(envVar)
  const settings = await loadSettings(projectPath)
  const existing = settings.pluginKeys.findIndex(
    (p) => p.pluginName === pluginName && p.envVar === envVar,
  )
  const entry = { pluginName, envVar, value }

  if (existing !== -1) {
    settings.pluginKeys[existing] = entry
  } else {
    settings.pluginKeys.push(entry)
  }

  await saveSettings(projectPath, settings)
}

// ---------------------------------------------------------------------------
// Public: general settings
// ---------------------------------------------------------------------------

/**
 * Updates the telemetry opt-in/out preference.
 */
export async function updateTelemetry(
  projectPath: string,
  enabled: boolean,
): Promise<void> {
  const settings = await loadSettings(projectPath)
  settings.telemetry = { ...settings.telemetry, enabled }
  await saveSettings(projectPath, settings)
}

/**
 * Updates the UI theme preference.
 */
export async function updateTheme(
  projectPath: string,
  theme: Theme,
): Promise<void> {
  const settings = await loadSettings(projectPath)
  settings.theme = theme
  await saveSettings(projectPath, settings)
}
