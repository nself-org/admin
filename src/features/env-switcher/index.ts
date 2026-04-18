/**
 * env-switcher feature — barrel export.
 * Client-safe exports only (types + component).
 * Server-side core logic (env-switcher.ts) must be imported directly in API routes.
 */

export { EnvSwitcher } from './EnvSwitcher'
export type {
  EnvCredentials,
  EnvSwitchResult,
  EnvSwitcherError,
  EnvSwitcherState,
  EnvTarget,
} from './types'
