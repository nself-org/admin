/**
 * requireAuth — unified session + CSRF guard for mutating API routes.
 *
 * Usage (in any POST/PUT/PATCH/DELETE route handler):
 *
 *   const authError = await requireAuth(request)
 *   if (authError) return authError
 *
 * Options:
 *   postSetupOnly — when true (default), blocks the request with 403 if the
 *                   admin password has not been set yet. Wizard routes should
 *                   pass { postSetupOnly: false } because they run before setup.
 *   csrf          — when true (default), validates the x-csrf-token header.
 *                   Mutating methods (POST/PUT/PATCH/DELETE) always require it
 *                   unless explicitly disabled.
 *
 * Returns null when the request is authorised, or a NextResponse (401/403)
 * when it is not. The caller must return the error response immediately.
 *
 * Background: validateCSRFToken() was only wired up in one of 231 POST
 * routes (sessions/revoke). This utility centralises the guard so it can
 * be applied consistently to all mutating routes.
 */

import { validateCSRFToken } from '@/lib/csrf'
import { hasAdminPassword } from '@/lib/database'
import { appendAuditFile, extractSourceIp } from '@/lib/audit-file'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export interface RequireAuthOpts {
  /**
   * When true (default), block the request if admin setup has not been
   * completed (no password set). Set to false for wizard/pre-setup routes.
   */
  postSetupOnly?: boolean
  /**
   * When true (default), validate the x-csrf-token header on mutating methods.
   * Set to false only for routes that use a different CSRF strategy.
   */
  csrf?: boolean
}

export async function requireAuth(
  request: NextRequest,
  opts: RequireAuthOpts = {},
): Promise<NextResponse | null> {
  const { postSetupOnly = true, csrf = true } = opts

  // GET / HEAD are safe methods — no session or CSRF check needed.
  // postSetupOnly check still applies to protect data reads after setup.
  const isMutating = !['GET', 'HEAD'].includes(request.method)
  const sourceIp = extractSourceIp(request.headers)

  // Setup-complete gate: block all access (reads and writes) until the admin
  // password has been configured — unless the caller opts out (wizard routes).
  if (postSetupOnly) {
    const setupComplete = await hasAdminPassword()
    if (!setupComplete) {
      return NextResponse.json(
        { success: false, error: 'Setup not complete' },
        { status: 403 },
      )
    }
  }

  // Session check: required for all mutating requests and for GET routes that
  // explicitly require authentication (callers invoke requireAuth on them).
  if (isMutating || postSetupOnly) {
    const cookieStore = await cookies()
    const sessionToken =
      cookieStore.get('nself-session')?.value ||
      request.cookies.get('nself-session')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      )
    }

    // CSRF check on mutating methods.
    if (isMutating && csrf) {
      const csrfValid = await validateCSRFToken(request, sessionToken)
      if (!csrfValid) {
        return NextResponse.json(
          { success: false, error: 'CSRF token validation failed' },
          { status: 403 },
        )
      }
    }
  }

  return null
}

/**
 * Convenience wrapper: same as requireAuth but always skips the setup-complete
 * gate. Use on wizard and pre-setup routes that need CSRF + session but run
 * before the admin password exists.
 */
export async function requireAuthPreSetup(
  request: NextRequest,
): Promise<NextResponse | null> {
  return requireAuth(request, { postSetupOnly: false })
}

/**
 * Wizard write guard: blocks write operations once setup is complete.
 *
 * Wizard routes (POST/PUT/PATCH/DELETE) must only operate before the admin
 * password has been set. Once setup is done, all wizard writes return 403
 * to prevent re-running the setup flow and overwriting a production config.
 *
 * Read (GET) requests from the wizard are always allowed (idempotent, used
 * for status polling by the setup UI while it is still rendered).
 *
 * Returns a NextResponse error if the request should be blocked, null if ok.
 */
export async function requireWizardNotComplete(
  request: NextRequest,
): Promise<NextResponse | null> {
  // Allow read requests regardless of setup state.
  if (['GET', 'HEAD'].includes(request.method)) {
    return null
  }

  // Block writes once setup is complete.
  const setupComplete = await hasAdminPassword()
  if (setupComplete) {
    return NextResponse.json(
      {
        success: false,
        error: 'Setup already complete. Wizard writes are disabled.',
      },
      { status: 403 },
    )
  }

  return null
}
