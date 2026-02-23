import { generateCSRFToken } from '@/lib/csrf'
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  const token = generateCSRFToken()

  const response = NextResponse.json({ token })

  // Set CSRF token in cookie
  response.cookies.set('nself-csrf', token, {
    httpOnly: false, // Must be readable by JavaScript for inclusion in headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return response
}
