/**
 * GET /api/account/licenses
 *
 * Returns all licenses for the authenticated account.
 * Proxies GET /account/licenses on NSELF_AUTH_URL.
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
    return NextResponse.json({
      success: true,
      data: [],
      offline: true,
      message: 'NSELF_AUTH_URL not configured — license data unavailable',
    })
  }

  try {
    const upstream = await fetch(`${AUTH_URL}/account/licenses`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch licenses' },
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
