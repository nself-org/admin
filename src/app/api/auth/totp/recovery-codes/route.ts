/**
 * POST /api/auth/totp/recovery-codes
 *
 * Regenerates recovery codes (replaces existing set).
 * Requires auth + CSRF.
 */

import { regenerateRecoveryCodes } from '@/lib/totp'
import { requireAuth } from '@/lib/require-auth'
import { addAuditLog } from '@/lib/database'
import { appendAuditFile, extractSourceIp } from '@/lib/audit-file'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const codes = await regenerateRecoveryCodes()

    const sourceIp = extractSourceIp(request.headers)
    await addAuditLog('totp_recovery_codes_regenerated', {}, true, 'admin')
    appendAuditFile({
      timestamp: new Date().toISOString(),
      user: 'admin',
      action: 'totp_recovery_codes_regenerated',
      sourceIp,
      success: true,
    })

    return NextResponse.json({ success: true, data: { recoveryCodes: codes } })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to regenerate recovery codes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
