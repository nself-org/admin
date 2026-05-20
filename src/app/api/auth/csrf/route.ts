import { generateCSRFToken } from '@/lib/csrf'
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  const token = generateCSRFToken()

  const response = NextResponse.json({ token })

  // Set CSRF token in cookie.
  // See login/route.ts for why isHttpCiServer is needed.
  const isHttpCiServer = process.env.PLAYWRIGHT_E2E_BYPASS_RATE_LIMIT === 'true'
  response.cookies.set('nself-csrf', token, {
    httpOnly: false, // Must be readable by JavaScript for inclusion in headers
    secure: process.env.NODE_ENV === 'production' && !isHttpCiServer,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return response
}
