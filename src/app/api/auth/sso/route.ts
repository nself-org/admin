/**
 * GET /api/auth/sso?redirect=<pathname>
 * POST /api/auth/sso
 *
 * SSO login endpoint. The middleware issues a browser GET redirect here when
 * it detects a valid SSO header but no existing session. The GET handler reads
 * the SSO header, creates a session, sets cookies, and bounces the browser to
 * the original destination.
 *
 * POST handler kept for server-side callers.
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

async function handleSSO(request: NextRequest): Promise<NextResponse> {
  const config = getSSOConfig()

  if (!config.enabled) {
    return NextResponse.json(
      {
        success: false,
        error:
          'SSO login disabled. Set NSELF_ADMIN_SSO_HEADER_ENABLED=true to enable.',
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

/**
 * GET /api/auth/sso?redirect=<pathname>
 *
 * Browser redirect target from middleware SSO detection. Reads the SSO header,
 * creates a session, sets the session cookie, and redirects to the original page.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessionResponse = await handleSSO(request)

  // On error, pass the JSON error through as-is
  if (!sessionResponse.ok) {
    return sessionResponse
  }

  // On success, redirect browser to the original destination
  const redirect = request.nextUrl.searchParams.get('redirect') || '/'
  const destination = new URL(redirect, request.url)

  // Copy the session + CSRF cookies from the JSON response into the redirect
  const redirectResponse = NextResponse.redirect(destination)
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie)
  })

  return redirectResponse
}

/**
 * POST /api/auth/sso
 *
 * Server-side caller path (returns JSON, no redirect).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleSSO(request)
}
