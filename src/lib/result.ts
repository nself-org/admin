/**
 * Result<T, E> — lightweight typed Result monad for admin operations.
 *
 * Purpose: Eliminate thrown exceptions from data-fetching paths; make
 *   success/failure explicit at the call site.
 * Inputs: ok(value) | err(error)
 * Outputs: Result<T, E> discriminated union
 * Constraints: Never throws; callers must check .ok before accessing .value.
 * SPORT: REGISTRY-WEB-SURFACES.md — admin typed errors
 */

export type Result<T, E = AdminError> = { ok: true; value: T } | { ok: false; error: E }

/** Wrap a successful value in a Result. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

/** Wrap an error in a Result. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

/**
 * AdminError — discriminated union covering every failure type in the admin GUI.
 *
 * Purpose: Typed errors for all 9 admin panels; each variant carries
 *   a user-facing message and optional details.
 * Inputs: constructed via factory helpers below
 * Outputs: AdminError discriminated union value
 * Constraints: All variants must have a `userMessage` field for rendering.
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: AdminError 6 variants
 */

export type AdminErrorType =
  | 'stack_offline'
  | 'auth_expired'
  | 'sql_error'
  | 'backup_failed'
  | 'deploy_failed'
  | 'network'

export interface AdminError {
  /** Discriminant — maps to one of the 6 admin error types. */
  type: AdminErrorType
  /** Human-readable message suitable for display in the UI. */
  userMessage: string
  /** Optional technical detail (not shown to user by default). */
  detail?: string
}

// ---------------------------------------------------------------------------
// Factory helpers — one per variant
// ---------------------------------------------------------------------------

export function stackOfflineError(detail?: string): AdminError {
  return {
    type: 'stack_offline',
    userMessage: 'nSelf stack is not running. Run `nself start` in your terminal to bring it up.',
    detail,
  }
}

export function authExpiredError(detail?: string): AdminError {
  return {
    type: 'auth_expired',
    userMessage: 'Your admin session has expired. Please log in again.',
    detail,
  }
}

export function sqlError(detail?: string): AdminError {
  return {
    type: 'sql_error',
    userMessage: 'The SQL query failed. Check your syntax and try again.',
    detail,
  }
}

export function backupFailedError(detail?: string): AdminError {
  return {
    type: 'backup_failed',
    userMessage: 'Backup operation failed. Check available disk space and try again.',
    detail,
  }
}

export function deployFailedError(detail?: string): AdminError {
  return {
    type: 'deploy_failed',
    userMessage: 'Deployment failed. Review the deployment log for details.',
    detail,
  }
}

export function networkError(detail?: string): AdminError {
  return {
    type: 'network',
    userMessage: 'A network error occurred. Check your connection and try again.',
    detail,
  }
}

/**
 * Map any unknown thrown value to an AdminError.
 * Prefers the more specific error types when recognisable signals are present.
 */
export function toAdminError(err: unknown): AdminError {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('session')) {
      return authExpiredError(err.message)
    }
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('econnrefused')) {
      return stackOfflineError(err.message)
    }
    return networkError(err.message)
  }
  return networkError(String(err))
}
