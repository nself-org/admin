/**
 * DELETE /api/account/team/[userId]
 *
 * Revokes a team member's seat.
 * Returns 404 when NSELF_ADMIN_MULTIUSER=false.
 */

import { validateSessionToken } from '@/lib/auth-db'
import { isMultiUserEnabled } from '@/lib/feature-flags'
import { NextRequest, NextResponse } from 'next/server'

const AUTH_URL = process.env.NSELF_AUTH_URL || ''

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  if (!isMultiUserEnabled()) {
    return NextResponse.json(
      {
        error: 'not_available',
        message:
          'Multi-user mode disabled. Set NSELF_ADMIN_MULTIUSER=true to enable.',
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

  const { userId } = await params

  if (!AUTH_URL) {
    return NextResponse.json(
      { success: false, error: 'NSELF_AUTH_URL not configured' },
      { status: 503 },
    )
  }

  try {
    const upstream = await fetch(`${AUTH_URL}/account/team/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!upstream.ok) {
      const body = await upstream.json().catch(() => ({}))
      return NextResponse.json(
        { success: false, error: body.error || 'Revoke failed' },
        { status: upstream.status },
      )
    }

    return NextResponse.json({ success: true })
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
