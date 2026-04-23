/**
 * POST /api/auth/sso
 *
 * SSO login endpoint. Called from middleware when a valid SSO header is detected.
 * Creates a LokiJS session for the email extracted from the upstream auth header.
 *
 * Returns 403 when:
 *  - SSO is disabled (NSELF_ADMIN_SSO_HEADER_ENABLED != true)
 *  - Header is absent or malformed
 *  - Email is not in nself_accounts AND auto-provision is off
 */

import { createLoginSession } from '@/lib/auth-db'
import { setCSRFCookie } from '@/lib/csrf'
import { getSession } from '@/lib/database'
import { getSSOConfig, getSSOEmail } from '@/lib/sso'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const config = getSSOConfig()

  if (!config.enabled) {
    return NextResponse.json(
      {
        success: false,
        error: 'SSO login disabled. Set NSELF_ADMIN_SSO_HEADER_ENABLED=true to enable.',
      },
      { status: 403 },
    )
  }

  const email = getSSOEmail(request)

  if (!email) {
    return NextResponse.json(
      {
        success: false,
        error: `SSO header "${config.headerName}" absent or invalid.`,
      },
      { status: 403 },
    )
  }

  try {
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    // Create a 8-hour session (SSO sessions are short-lived; proxy renews them)
    const sessionToken = await createLoginSession(ip, userAgent, false)

    const sessionDuration = 8 * 60 * 60 * 1000 // 8 hours

    const response = NextResponse.json({
      success: true,
      email,
      sso: true,
      expiresAt: new Date(Date.now() + sessionDuration).toISOString(),
    })

    response.cookies.set('nself-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: sessionDuration / 1000,
      path: '/',
    })

    const session = await getSession(sessionToken)
    if (session) {
      setCSRFCookie(response, session.csrfToken)
    }

    return response
  } catch (error) {
    console.error(
      'SSO login error:',
      error instanceof Error ? error.message : 'Unknown error',
    )
    return NextResponse.json(
      { success: false, error: 'SSO login failed' },
      { status: 500 },
    )
  }
}
