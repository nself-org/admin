/**
 * POST /api/auth/totp/disable
 *
 * Disables TOTP 2FA and wipes the stored secret + recovery codes.
 */

import { appendAuditFile, extractSourceIp } from '@/lib/audit-file'
import { addAuditLog } from '@/lib/database'
import { requireAuth } from '@/lib/require-auth'
import { disableTotp } from '@/lib/totp'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    await disableTotp()

    const sourceIp = extractSourceIp(request.headers)
    await addAuditLog('totp_disabled', {}, true, 'admin')
    appendAuditFile({
      timestamp: new Date().toISOString(),
      user: 'admin',
      action: 'totp_disabled',
      sourceIp,
      success: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to disable TOTP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
