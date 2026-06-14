/**
 * POST /api/auth/bootstrap
 *
 * Purpose: Accept a session token delivered by the nself CLI over localhost
 *   and convert it into an HttpOnly session cookie. This endpoint removes the
 *   need to embed the token in the browser URL (?token=...) which would expose
 *   it in browser history, access logs, and Referer headers.
 *
 * Inputs: JSON body { token: string } — the 64-char hex session token generated
 *   by the CLI via NewSessionToken().
 *
 * Outputs: 200 OK + Set-Cookie: nself-session on success; 400/429/500 on error.
 *
 * Constraints:
 *   - Rate-limited: 1 request per 60 seconds per IP (stored in the edge-safe RL
 *     store via an in-process guard). The admin server binds to 127.0.0.1 so this
 *     endpoint is only reachable from the local machine.
 *   - Token must be a 64-char lowercase hex string (32 random bytes from CLI).
 *   - The token must already exist in the LokiJS session store (created by the
 *     CLI before calling BootstrapSession, via the existing createLoginSession
 *     path if the admin setup is complete, or pre-registered via a special
 *     bootstrapCliSession helper introduced here).
 *   - Cookie flags: HttpOnly=true, SameSite=Lax, Secure only in production.
 */

import { bootstrapCliSession } from '@/lib/auth-db'
import { NextRequest, NextResponse } from 'next/server'

/** In-process rate-limit store: IP → last-call timestamp (ms). */
const bootstrapRl = new Map<string, number>()
const BOOTSTRAP_RL_MS = 60_000 // 1 per 60 s

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate-limit: 1 call per 60s per IP
  const ip = getClientIp(request)
  const now = Date.now()
  const last = bootstrapRl.get(ip) ?? 0
  if (now - last < BOOTSTRAP_RL_MS) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Bootstrap may only be called once per 60 seconds.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }
  bootstrapRl.set(ip, now)

  // Parse and validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || !('token' in body)) {
    return NextResponse.json({ error: 'Missing required field: token' }, { status: 400 })
  }

  const { token } = body as { token: unknown }

  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json(
      { error: 'Invalid token format. Expected 64-char hex string.' },
      { status: 400 }
    )
  }

  // Register the CLI-generated token as a valid session in the DB
  try {
    await bootstrapCliSession(token)
  } catch (err) {
    console.error('[bootstrap] failed to register CLI session token:', err)
    return NextResponse.json(
      { error: 'Failed to register session', details: String(err) },
      { status: 500 }
    )
  }

  // Issue the session cookie — same flags as the normal login route
  const sessionDuration = 24 * 60 * 60 * 1000 // 24 h for CLI sessions
  const isHttpCiServer = process.env.PLAYWRIGHT_E2E_BYPASS_RATE_LIMIT === 'true'

  const response = NextResponse.json({ ok: true })
  response.cookies.set('nself-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && !isHttpCiServer,
    sameSite: 'lax',
    maxAge: sessionDuration / 1000,
    path: '/',
  })

  return response
}
