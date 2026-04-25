/**
 * POST /api/account/licenses/[id]/deactivate
 *
 * Deactivates a license on this instance.
 * Proxies POST /account/licenses/:id/deactivate on NSELF_AUTH_URL.
 */

import { validateSessionToken } from '@/lib/auth-db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

const AUTH_URL = process.env.NSELF_AUTH_URL || ''

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const token = request.cookies.get('nself-session')?.value
  if (!token || !(await validateSessionToken(token))) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  const { id } = await params

  if (!AUTH_URL) {
    return NextResponse.json(
      { success: false, error: 'NSELF_AUTH_URL not configured' },
      { status: 503 },
    )
  }

  try {
    const upstream = await fetch(
      `${AUTH_URL}/account/licenses/${id}/deactivate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )

    if (!upstream.ok) {
      const body = await upstream.json().catch(() => ({}))
      return NextResponse.json(
        { success: false, error: body.error || 'Deactivation failed' },
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
