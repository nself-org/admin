/**
 * POST /api/auth/totp/confirm
 *
 * Verifies the first TOTP code from the user's authenticator app and
 * enables TOTP.  Returns 10 one-time recovery codes.
 */

import { appendAuditFile, extractSourceIp } from '@/lib/audit-file'
import { addAuditLog } from '@/lib/database'
import { requireAuth } from '@/lib/require-auth'
import { confirmTotpSetup } from '@/lib/totp'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json().catch(() => null)
    const code = body?.code

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'code is required' },
        { status: 400 },
      )
    }

    const result = await confirmTotpSetup(code.trim())

    const sourceIp = extractSourceIp(request.headers)
    await addAuditLog(
      'totp_setup',
      { success: result.success },
      result.success,
      'admin',
    )
    appendAuditFile({
      timestamp: new Date().toISOString(),
      user: 'admin',
      action: 'totp_setup',
      sourceIp,
      success: result.success,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid TOTP code' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { recoveryCodes: result.recoveryCodes },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to confirm TOTP setup',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
