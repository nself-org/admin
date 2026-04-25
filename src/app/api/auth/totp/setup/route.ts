/**
 * POST /api/auth/totp/setup
 *
 * Initiates TOTP setup: generates a secret, returns QR code data URL and
 * manual entry key. Does NOT enable TOTP yet.
 *
 * GET /api/auth/totp/setup
 *
 * Returns current TOTP status (enabled / remaining recovery codes).
 */

import { requireAuth } from '@/lib/require-auth'
import {
  getRemainingRecoveryCodeCount,
  initTotpSetup,
  isTotpEnabled,
} from '@/lib/totp'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const enabled = await isTotpEnabled()
  const remainingRecoveryCodes = enabled
    ? await getRemainingRecoveryCodeCount()
    : null

  return NextResponse.json({
    success: true,
    data: { enabled, remainingRecoveryCodes },
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { secret, qrDataUrl, manualEntryKey } = await initTotpSetup()

    return NextResponse.json({
      success: true,
      data: { qrDataUrl, manualEntryKey: secret, secret: manualEntryKey },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialise TOTP setup',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
