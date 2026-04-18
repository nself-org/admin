/**
 * Types for the license feature.
 * Handles nSelf license keys, tiers, plugin coverage, and validation state.
 */

/**
 * A single license key entry as returned by `nself license status`.
 * The `key` field is always masked — the CLI never returns the raw secret.
 */
export interface LicenseKey {
  /** Masked key, e.g. "nself_pro_••••••••••••••••••••••••••••••••" */
  key: string
  /** Product slug derived from key prefix, e.g. "pro" */
  product: string
  /** Human-readable display name, e.g. "ɳSelf Pro" */
  displayName: string
  /** Tier label, e.g. "Pro", "ɳSelf+", "Enterprise" */
  tier: string
  /** Plugins covered by this key */
  plugins: string[]
  /** ISO 8601 expiry date or null for lifetime keys */
  expiresAt: string | null
  /** Whether the key passed server-side validation */
  valid: boolean
}

/**
 * Full license status as returned by the license feature.
 * Aggregates all configured keys and their combined plugin coverage.
 */
export interface LicenseStatus {
  /** All configured license keys (may be empty) */
  keys: LicenseKey[]
  /** Highest active tier across all keys, e.g. "Enterprise" */
  activeTier: string
  /** Union of all plugins covered by valid keys */
  pluginsCovered: string[]
  /** True when at least one valid key is configured */
  hasLicense: boolean
}

/**
 * Result from setting a license key via `nself license set <key>`.
 */
export interface LicenseSetResult {
  success: boolean
  /** Product slug identified from the key prefix */
  product: string
  /** CLI output message */
  message: string
}

/**
 * Result from validating the current license against ping.nself.org.
 */
export interface LicenseValidateResult {
  valid: boolean
  /** Tier confirmed by the server */
  tier: string
  /** Plugins confirmed by the server */
  plugins: string[]
  /** ISO 8601 expiry date or null */
  expiresAt: string | null
  /** Human-readable status message */
  message: string
}

/**
 * Structured error thrown by license core logic.
 * Always catches and re-wraps errors from CLI execution.
 */
export interface LicenseError extends Error {
  code:
    | 'CLI_NOT_FOUND'
    | 'INVALID_KEY'
    | 'VALIDATE_FAILED'
    | 'CLEAR_FAILED'
    | 'IO_ERROR'
}
