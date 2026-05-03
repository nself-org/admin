/**
 * GET /api/account/me
 *
 * Returns the authenticated operator's account info from the O04 auth service.
 * Proxies GET /account/me on NSELF_AUTH_URL.
 *
 * Security gate: when NSELF_AUTH_URL is unset or unreachable, this route returns
 * 503 with X-Service-Required: auth. It NEVER synthesises a fake operator record.
 * NSELF_AUTH_REQUIRED (default "true" in production) controls the enforcement mode:
 *   - "true"  → 503 when auth absent (production default)
 *   - "false" → 503 still applies; this flag is reserved for future local-dev opt-out
 *               but is intentionally NOT active at this time.
 */

import { validateSessionToken } from '@/lib/auth-db'
import { NextRequest, NextResponse } from 'next/server'

const AUTH_URL = process.env.NSELF_AUTH_URL || ''

function authRequiredResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Auth service not configured or unreachable.',
      service: 'auth',
    },
    {
      status: 503,
      headers: { 'X-Service-Required': 'auth' },
    },
  )
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get('nself-session')?.value
  if (!token || !(await validateSessionToken(token))) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  if (!AUTH_URL) {
    return authRequiredResponse()
  }

  try {
    const upstream = await fetch(`${AUTH_URL}/account/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch account info' },
        { status: upstream.status },
      )
    }

    const data = await upstream.json()
    return NextResponse.json({ success: true, data })
  } catch {
    return authRequiredResponse()
  }
}
