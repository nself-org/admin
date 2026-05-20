// Using Web Crypto API instead of Node crypto for edge runtime compatibility
import { NextRequest, NextResponse } from 'next/server'
import { getSessionInfo } from './auth-db'

const CSRF_TOKEN_LENGTH = 32
const CSRF_COOKIE_NAME = 'nself-csrf'
const CSRF_HEADER_NAME = 'x-csrf-token'

// Allowed origins for requests (local development and production)

const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https?:\/\/0\.0\.0\.0(:\d+)?$/,
  /^https?:\/\/[\w-]+\.localhost(:\d+)?$/,
  /^https?:\/\/[\w-]+\.local(:\d+)?$/,
  /^https?:\/\/admin\.local\.nself\.org(:\d+)?$/,
]

/**
 * Generate a CSRF token using Web Crypto API
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Set CSRF token in response cookies
 */
export function setCSRFCookie(response: NextResponse, token?: string): string {
  const csrfToken = token || generateCSRFToken()

  // See login/route.ts for why isHttpCiServer is needed: WebKit rejects Secure
  // cookies over HTTP even on localhost; the CI server runs on plain HTTP.
  const isHttpCiServer = process.env.PLAYWRIGHT_E2E_BYPASS_RATE_LIMIT === 'true'
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production' && !isHttpCiServer,
    sameSite: 'strict',
    path: '/',
  })

  return csrfToken
}

/**
 * Validate CSRF token from request (session-based)
 */
export async function validateCSRFToken(
  request: NextRequest,
  sessionToken?: string
): Promise<boolean> {
  // Skip CSRF check for GET and HEAD requests
  if (['GET', 'HEAD'].includes(request.method)) {
    return true
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!headerToken) {
    return false
  }

  // If session token provided, validate against session's CSRF token
  if (sessionToken) {
    const session = await getSessionInfo(sessionToken)
    if (!session) {
      return false
    }

    // Constant time comparison to prevent timing attacks
    if (session.csrfToken.length !== headerToken.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < session.csrfToken.length; i++) {
      result |= session.csrfToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
    }

    return result === 0
  }

  // Otherwise validate against cookie (fallback for non-session requests)
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value

  if (!cookieToken) {
    return false
  }

  // Constant time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }

  return result === 0
}

/**
 * Validate CSRF token from request (non-async version for backward compatibility)
 */
export function validateCSRFTokenSync(request: NextRequest): boolean {
  // Skip CSRF check for GET and HEAD requests
  if (['GET', 'HEAD'].includes(request.method)) {
    return true
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value

  if (!cookieToken) {
    return false
  }

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  // Constant time comparison to prevent timing attacks
  if (!headerToken || cookieToken.length !== headerToken.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }

  return result === 0
}

/**
 * CSRF error response
 */
export function csrfErrorResponse(): NextResponse {
  return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 })
}

/**
 * Validate request origin/referer for additional CSRF protection
 * This is used alongside sameSite cookies for defense in depth
 */
export function validateOrigin(request: NextRequest): boolean {
  // Skip for GET and HEAD requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true
  }

  // Get origin or referer header
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // If neither is present, it might be a same-origin request or non-browser client
  // In development, we're more lenient; in production, require origin
  if (!origin && !referer) {
    // Allow requests without origin in development
    return process.env.NODE_ENV === 'development'
  }

  const urlToCheck = origin || (referer ? new URL(referer).origin : null)

  if (!urlToCheck) {
    return false
  }

  // Check against allowed patterns
  return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(urlToCheck))
}

/**
 * Origin validation error response
 */
export function originErrorResponse(): NextResponse {
  return NextResponse.json({ error: 'Request origin not allowed' }, { status: 403 })
}
