/**
 * Types for the env-switcher feature.
 * Handles local / staging / prod environment context switching via the nself CLI.
 */

/** The three canonical deployment targets supported by nself. */
export type EnvTarget = 'local' | 'staging' | 'prod'

/** Runtime state of the env-switcher component. */
export interface EnvSwitcherState {
  current: EnvTarget
  available: EnvTarget[]
  switching: boolean
  error: string | null
}

/** Result returned by switchEnv() after a successful or failed switch. */
export interface EnvSwitchResult {
  success: boolean
  previous: EnvTarget
  current: EnvTarget
  message: string
}

/** Per-environment credential references resolved from vault. */
export interface EnvCredentials {
  host?: string
  port?: number
  sshKey?: string
  vaultPath?: string
}

/** Structured error thrown by env-switcher core logic. */
export interface EnvSwitcherError extends Error {
  code:
    | 'CLI_NOT_FOUND'
    | 'PARSE_ERROR'
    | 'SWITCH_FAILED'
    | 'INVALID_TARGET'
    | 'NETWORK_ERROR'
  details?: string
}
