/**
 * requireAuth — unified session + CSRF guard for mutating API routes.
 *
 * Usage (in any POST/PUT/PATCH/DELETE route handler):
 *
 *   const authError = await requireAuth(request)
 *   if (authError) return authError
 *
 * Returns null when the request is authorised, or a NextResponse (401/403)
 * when it is not. The caller must return the error response immediately.
 *
 * Background: validateCSRFToken() was only wired up in one of 231 POST
 * routes (sessions/revoke). This utility centralises the guard so it can
 * be applied consistently to all mutating routes.
 */

import { validateCSRFToken } from '@/lib/csrf'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function requireAuth(
  request: NextRequest,
): Promise<NextResponse | null> {
  // GET / HEAD are safe methods — no session or CSRF check needed.
  if (['GET', 'HEAD'].includes(request.method)) {
    return null
  }

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

  const csrfValid = await validateCSRFToken(request, sessionToken)
  if (!csrfValid) {
    return NextResponse.json(
      { success: false, error: 'CSRF token validation failed' },
      { status: 403 },
    )
  }

  return null
}
