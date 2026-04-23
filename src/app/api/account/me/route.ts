/**
 * GET /api/account/me
 *
 * Returns the authenticated operator's account info from the O04 auth service.
 * Proxies GET /account/me on NSELF_AUTH_URL.
 */

import { validateSessionToken } from '@/lib/auth-db'
import { NextRequest, NextResponse } from 'next/server'

const AUTH_URL = process.env.NSELF_AUTH_URL || ''

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get('nself-session')?.value
  if (!token || !(await validateSessionToken(token))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!AUTH_URL) {
    // Auth service not configured — return a stub operator record so the UI
    // renders in offline/standalone mode.
    return NextResponse.json({
      success: true,
      data: {
        email: 'admin@localhost',
        tier: 'self-hosted',
        licenseCount: 0,
        lastLogin: new Date().toISOString(),
      },
    })
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
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Auth service unavailable',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 },
    )
  }
}
