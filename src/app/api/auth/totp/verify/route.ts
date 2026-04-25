/**
 * POST /api/auth/totp/verify
 *
 * Verifies a TOTP code (or recovery code) during the login flow.
 * Called after password authentication succeeds when TOTP is enabled.
 */

import { verifyTotpCode } from '@/lib/totp'
import { addAuditLog } from '@/lib/database'
import { appendAuditFile, extractSourceIp } from '@/lib/audit-file'
import { isRateLimited, getRateLimitInfo } from '@/lib/rateLimiter'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate-limit TOTP verification like auth endpoints
  if (isRateLimited(request, 'auth')) {
    const info = getRateLimitInfo(request, 'auth')
    return NextResponse.json(
      { success: false, error: 'Too many verification attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((info.resetTime - Date.now()) / 1000)),
        },
      },
    )
  }

  try {
    const body = await request.json().catch(() => null)
    const code = body?.code

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'code is required' },
        { status: 400 },
      )
    }

    const valid = await verifyTotpCode(code.trim())

    const sourceIp = extractSourceIp(request.headers)
    await addAuditLog('totp_verify', { success: valid }, valid, 'admin')
    appendAuditFile({
      timestamp: new Date().toISOString(),
      user: 'admin',
      action: 'totp_verify',
      sourceIp,
      success: valid,
    })

    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired TOTP code' },
        { status: 401 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'TOTP verification failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
