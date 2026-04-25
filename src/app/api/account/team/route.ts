/**
 * GET /api/account/team
 * POST /api/account/team/invite  (handled in invite/route.ts)
 *
 * Lists team seats for the authenticated account.
 * Returns 404 when NSELF_ADMIN_MULTIUSER=false.
 */

import { validateSessionToken } from '@/lib/auth-db'
import { isMultiUserEnabled } from '@/lib/feature-flags'
import { NextRequest, NextResponse } from 'next/server'

const AUTH_URL = process.env.NSELF_AUTH_URL || ''

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isMultiUserEnabled()) {
    return NextResponse.json(
      {
        error: 'not_available',
        message:
          'Multi-user mode disabled. Set NSELF_ADMIN_MULTIUSER=true to enable.',
        docs: 'https://docs.nself.org/admin/single-user-posture',
      },
      { status: 404 },
    )
  }

  const token = request.cookies.get('nself-session')?.value
  if (!token || !(await validateSessionToken(token))) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  if (!AUTH_URL) {
    return NextResponse.json({ success: true, data: [], offline: true })
  }

  try {
    const upstream = await fetch(`${AUTH_URL}/account/team`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch team' },
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
