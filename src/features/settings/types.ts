/**
 * Types for the settings feature.
 * Handles credentials, plugin keys, env vars, telemetry, theme, and shortcuts.
 * Settings are stored per-project at {projectPath}/.nself/admin-settings.json
 */

/** A named credential entry (env var name → value). Values are sensitive — never log. */
export interface CredentialEntry {
  key: string // env var name, e.g. "HASURA_GRAPHQL_ADMIN_SECRET"
  value: string // stored value (sensitive — never log)
  description?: string
}

/** A plugin-specific key entry mapping a plugin to its required API env var. */
export interface PluginKeyEntry {
  pluginName: string // e.g. "ai", "mux"
  envVar: string // e.g. "OPENAI_API_KEY"
  value: string
}

/** Telemetry opt-in/out settings. */
export interface TelemetrySettings {
  enabled: boolean
  anonymousId?: string
}

/** UI theme preference. */
export type Theme = 'dark' | 'system'

/** A single keyboard shortcut binding. */
export interface ShortcutBinding {
  action: string // e.g. "open-command-palette"
  keys: string // e.g. "ctrl+k" or "cmd+k"
}

/** Full admin settings document persisted per-project. */
export interface AdminSettings {
  version: 1
  credentials: CredentialEntry[]
  pluginKeys: PluginKeyEntry[]
  envVars: Record<string, string>
  telemetry: TelemetrySettings
  theme: Theme
  shortcuts: ShortcutBinding[]
}

/** Structured error thrown by settings core logic. */
export interface SettingsError extends Error {
  code: 'IO_ERROR' | 'INVALID_KEY' | 'PARSE_ERROR'
  details?: string
}
