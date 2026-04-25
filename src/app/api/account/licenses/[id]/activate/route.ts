/**
 * POST /api/account/licenses/[id]/activate
 *
 * Activates a license, binding it to the instance device-id.
 * Proxies POST /account/licenses/:id/activate on NSELF_AUTH_URL.
 */

import { validateSessionToken } from '@/lib/auth-db'
import { requireAuth } from '@/lib/require-auth'
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import os from 'os'
import path from 'path'

const AUTH_URL = process.env.NSELF_AUTH_URL || ''

function getDeviceId(): string {
  const deviceIdPath = path.join(os.homedir(), '.config', 'nself', 'device-id')
  try {
    if (fs.existsSync(deviceIdPath)) {
      return fs.readFileSync(deviceIdPath, 'utf-8').trim()
    }
  } catch {
    // Fall through to generate
  }
  return 'unknown'
}

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
  const deviceId = getDeviceId()

  if (!AUTH_URL) {
    return NextResponse.json(
      { success: false, error: 'NSELF_AUTH_URL not configured' },
      { status: 503 },
    )
  }

  try {
    const upstream = await fetch(
      `${AUTH_URL}/account/licenses/${id}/activate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId }),
      },
    )

    if (!upstream.ok) {
      const body = await upstream.json().catch(() => ({}))
      return NextResponse.json(
        { success: false, error: body.error || 'Activation failed' },
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
