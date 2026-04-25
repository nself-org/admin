import { NextRequest, NextResponse } from 'next/server'

// ── Feature flag helpers ────────────────────────────────────────────────────
// Inline read (not imported from feature-flags.ts) because middleware runs
// in the Edge runtime where module resolution works differently.
function isMultiUserEnabled(): boolean {
  return process.env.NSELF_ADMIN_MULTIUSER === 'true'
}

/**
 * Route prefixes that are part of the multi-user feature (disabled by default).
 * When NSELF_ADMIN_MULTIUSER is false, page routes return Next.js 404 and
 * API routes are blocked before session validation.
 *
 * Note: /api/users/* and /api/auth/roles/* already return 404 from their
 * own handlers. This middleware layer adds defence-in-depth so the block
 * applies even if a handler is accidentally replaced with a real implementation
 * before the CLI commands exist.
 */
const MULTIUSER_PAGE_PREFIXES = ['/users', '/tenant', '/auth/roles', '/team']
const MULTIUSER_API_PREFIXES = [
  '/api/users',
  '/api/auth/roles',
  '/api/account/team',
]

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/init', // Allow init pages for project setup
  '/api/auth/login',
  '/api/auth/init',
  '/api/auth/csrf', // CSRF token must be fetchable before login (no session yet)
  '/api/auth/check', // Allow checking auth status
  '/api/auth/sso', // SSO header auto-login endpoint
  '/api/auth/validate-session', // Allow session validation from middleware
  '/api/health',
  '/api/project/status', // Allow checking project status without auth
  '/api/wizard', // Allow all wizard endpoints (pre-setup; route handlers enforce requireAuthPreSetup)
  '/api/auth/totp/verify', // TOTP verify is called during login (before full session)
  '/_next',
  '/favicon.ico',
  '/site.webmanifest',
  '/sw.js',
]

// ── Security headers ────────────────────────────────────────────────────────

function generateNonce(): string {
  const buffer = new Uint8Array(16)
  globalThis.crypto.getRandomValues(buffer)
  return btoa(
    Array.from(buffer)
      .map((b) => String.fromCharCode(b))
      .join(''),
  )
}

function buildCsp(nonce: string): string {
  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    // Production: nonce-based, no unsafe-eval, no unsafe-inline for scripts
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline'", // inline styles are common in React apps
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ')
  }

  // Development: permissive for HMR and dev tools (unsafe-eval needed for
  // Next.js dev mode webpack runtime)
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss:",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
}

function applySecurityHeaders(
  response: NextResponse,
  nonce: string,
): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  )
  response.headers.set('Content-Security-Policy', buildCsp(nonce))
  // Expose nonce to the page via header so _document can pick it up
  response.headers.set('x-nonce', nonce)
  return response
}

// ── Per-minute rate limiting (inline — middleware runs on Edge) ─────────────
// We cannot import from rateLimiter.ts (Node.js module) in Edge middleware,
// so we maintain a minimal in-process store for wizard + auth endpoints.

interface RlEntry {
  count: number
  reset: number
}

const rlStore = new Map<string, RlEntry>()

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(
  ip: string,
  bucket: string,
  maxPerMin: number,
): boolean {
  const key = `${bucket}:${ip}`
  const now = Date.now()
  const entry = rlStore.get(key)

  if (!entry || entry.reset < now) {
    rlStore.set(key, { count: 1, reset: now + 60_000 })
    return false // not limited
  }

  entry.count += 1
  return entry.count > maxPerMin
}

// Cleanup stale entries every 2 minutes (lazy)
let lastCleanup = Date.now()
function maybeCleanup() {
  const now = Date.now()
  if (now - lastCleanup > 120_000) {
    for (const [k, e] of rlStore.entries()) {
      if (e.reset < now) rlStore.delete(k)
    }
    lastCleanup = now
  }
}

// ── Main middleware ──────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  maybeCleanup()

  // ── Multi-user feature flag gate ─────────────────────────────────────────
  if (!isMultiUserEnabled()) {
    if (MULTIUSER_API_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.json(
        {
          error: 'not_available',
          message:
            'Multi-user mode disabled. Set NSELF_ADMIN_MULTIUSER=true to enable.',
          docs: 'https://docs.nself.org/admin/single-user-posture',
        },
        { status: 404 },
      )
    }
    if (MULTIUSER_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) {
      return NextResponse.rewrite(new URL('/404', request.url))
    }
  }

  // ── Per-minute rate limits ───────────────────────────────────────────────
  const ip = getIp(request)

  // Auth endpoints: 10 req/min/IP
  if (
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/totp')
  ) {
    if (checkRateLimit(ip, 'auth_strict', 10)) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: 'Too many requests. Try again in a minute.',
        },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        },
      )
    }
  }

  // Wizard endpoints: 60 req/min/IP
  if (pathname.startsWith('/api/wizard')) {
    if (checkRateLimit(ip, 'wizard', 60)) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: 'Too many wizard requests. Try again in a minute.',
        },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        },
      )
    }
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    const nonce = generateNonce()
    const response = NextResponse.next()
    return applySecurityHeaders(response, nonce)
  }

  // ── SSO header auto-login ────────────────────────────────────────────────
  if (process.env.NSELF_ADMIN_SSO_HEADER_ENABLED === 'true') {
    const ssoHeaderName =
      process.env.NSELF_ADMIN_SSO_HEADER_NAME ||
      'CF-Access-Authenticated-User-Email'
    const ssoEmail = request.headers.get(ssoHeaderName)
    const existingSession = request.cookies.get('nself-session')?.value

    if (ssoEmail && !existingSession && !pathname.startsWith('/api/')) {
      const ssoUrl = new URL('/api/auth/sso', request.url)
      ssoUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(ssoUrl)
    }
  }

  // Check for session cookie
  const sessionToken = request.cookies.get('nself-session')?.value

  // If no session token, redirect to login
  if (!sessionToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // For page routes: cookie existence is sufficient. The client-side
  // AuthContext validates the session via /api/auth/check on mount, and
  // Layout redirects to /login if isAuthenticated becomes false.
  if (!pathname.startsWith('/api/')) {
    const nonce = generateNonce()
    const response = NextResponse.next()
    return applySecurityHeaders(response, nonce)
  }

  // For API routes: validate session token via internal API call.
  const baseUrl = request.nextUrl.origin
  try {
    const validateResponse = await fetch(
      `${baseUrl}/api/auth/validate-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: sessionToken }),
      },
    )

    if (!validateResponse.ok) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
  } catch {
    return NextResponse.json(
      { error: 'Session validation failed' },
      { status: 401 },
    )
  }

  const nonce = generateNonce()
  const response = NextResponse.next()
  return applySecurityHeaders(response, nonce)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
