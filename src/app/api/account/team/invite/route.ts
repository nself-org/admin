/**
 * POST /api/account/team/invite
 *
 * Sends a team invite to an email address.
 * Returns 404 when NSELF_ADMIN_MULTIUSER=false.
 */

import { validateSessionToken } from '@/lib/auth-db'
import { isMultiUserEnabled } from '@/lib/feature-flags'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/require-auth'

const AUTH_URL = process.env.NSELF_AUTH_URL || ''

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'viewer']).default('viewer'),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

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

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 },
    )
  }

  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: parsed.error.format(),
      },
      { status: 400 },
    )
  }

  if (!AUTH_URL) {
    return NextResponse.json(
      { success: false, error: 'NSELF_AUTH_URL not configured' },
      { status: 503 },
    )
  }

  try {
    const upstream = await fetch(`${AUTH_URL}/account/team/invite`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parsed.data),
    })

    if (!upstream.ok) {
      const upstreamBody = await upstream.json().catch(() => ({}))
      return NextResponse.json(
        { success: false, error: upstreamBody.error || 'Invite failed' },
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
