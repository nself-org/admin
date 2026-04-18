/**
 * License Status API Route
 * GET: Validate the configured NSELF_PLUGIN_LICENSE_KEY against ping.nself.org
 */

import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

interface LicenseStatusResponse {
  valid: boolean
  tier: string | null
  expiresAt: string | null
  pluginsAllowed: string[] | null
}

interface PingValidateResponse {
  valid?: boolean
  tier?: string
  expiresAt?: string
  pluginsAllowed?: string[]
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  const licenseKey = process.env.NSELF_PLUGIN_LICENSE_KEY

  if (!licenseKey) {
    logger.api('GET', '/api/license', 200, Date.now() - startTime)
    return NextResponse.json<LicenseStatusResponse>({
      valid: false,
      tier: null,
      expiresAt: null,
      pluginsAllowed: null,
    })
  }

  try {
    const res = await fetch('https://ping.nself.org/license/validate', {
      headers: { Authorization: `Bearer ${licenseKey}` },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      logger.warn('License validation request failed', { status: res.status })
      logger.api('GET', '/api/license', 200, Date.now() - startTime)
      return NextResponse.json<LicenseStatusResponse>({
        valid: false,
        tier: null,
        expiresAt: null,
        pluginsAllowed: null,
      })
    }

    const data = (await res.json()) as PingValidateResponse

    logger.api('GET', '/api/license', 200, Date.now() - startTime)

    return NextResponse.json<LicenseStatusResponse>({
      valid: data.valid === true,
      tier: data.tier ?? null,
      expiresAt: data.expiresAt ?? null,
      pluginsAllowed: data.pluginsAllowed ?? null,
    })
  } catch (error) {
    const err = error as { message?: string }
    logger.error('License validation error', { error: err.message })

    // On network error return invalid — do not expose the key or error details
    logger.api('GET', '/api/license', 200, Date.now() - startTime)
    return NextResponse.json<LicenseStatusResponse>({
      valid: false,
      tier: null,
      expiresAt: null,
      pluginsAllowed: null,
    })
  }
}
