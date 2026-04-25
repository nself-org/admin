/**
 * GET /api/account/audit
 *
 * Returns account-scoped audit events, cursor-paginated.
 * Proxies GET /account/audit on NSELF_AUTH_URL.
 *
 * Query params:
 *   limit    - max events (default 50, max 200)
 *   cursor   - opaque pagination cursor from prior response
 *   type     - event type filter (optional)
 *   dateFrom - ISO date string start (optional)
 *   dateTo   - ISO date string end (optional)
 *   actor    - actor email filter (optional)
 */

import { validateSessionToken } from '@/lib/auth-db'
import { NextRequest, NextResponse } from 'next/server'

const AUTH_URL = process.env.NSELF_AUTH_URL || ''

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get('nself-session')?.value
  if (!token || !(await validateSessionToken(token))) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  const { searchParams } = request.nextUrl
  const rawLimit = parseInt(searchParams.get('limit') || '50', 10)
  const limit = isNaN(rawLimit) ? 50 : Math.max(1, Math.min(rawLimit, 200))
  const cursor = searchParams.get('cursor') || ''
  const type = searchParams.get('type') || ''
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const actor = searchParams.get('actor') || ''

  if (!AUTH_URL) {
    // Return empty result so the UI renders its empty state
    return NextResponse.json({
      success: true,
      data: { events: [], nextCursor: null, total: 0 },
      offline: true,
      message: 'NSELF_AUTH_URL not configured — audit data unavailable',
    })
  }

  try {
    const qs = new URLSearchParams()
    qs.set('limit', String(limit))
    if (cursor) qs.set('cursor', cursor)
    if (type) qs.set('type', type)
    if (dateFrom) qs.set('dateFrom', dateFrom)
    if (dateTo) qs.set('dateTo', dateTo)
    if (actor) qs.set('actor', actor)

    const upstream = await fetch(`${AUTH_URL}/account/audit?${qs.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch audit events' },
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
