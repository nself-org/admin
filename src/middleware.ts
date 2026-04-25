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
  '/_next',
  '/favicon.ico',
  '/site.webmanifest',
  '/sw.js',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Multi-user feature flag gate ─────────────────────────────────────────
  // Block all multi-user page and API routes when NSELF_ADMIN_MULTIUSER is
  // off (default). This fires BEFORE session checks so unauthenticated
  // requests also get blocked — no information leak about the feature.
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

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // ── SSO header auto-login ────────────────────────────────────────────────────
  // When NSELF_ADMIN_SSO_HEADER_ENABLED=true, check for the configured SSO
  // header (default: CF-Access-Authenticated-User-Email). If the header is
  // present and no session cookie exists, redirect through /api/auth/sso to
  // create a session and issue the cookie. This supports Cloudflare Access,
  // nginx auth_request, and similar header-based SSO patterns.
  if (process.env.NSELF_ADMIN_SSO_HEADER_ENABLED === 'true') {
    const ssoHeaderName =
      process.env.NSELF_ADMIN_SSO_HEADER_NAME ||
      'CF-Access-Authenticated-User-Email'
    const ssoEmail = request.headers.get(ssoHeaderName)
    const existingSession = request.cookies.get('nself-session')?.value

    if (ssoEmail && !existingSession && !pathname.startsWith('/api/')) {
      // Redirect to SSO endpoint which will create a session and bounce back
      const ssoUrl = new URL('/api/auth/sso', request.url)
      ssoUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(ssoUrl)
    }
  }

  // Check for session cookie
  const sessionToken = request.cookies.get('nself-session')?.value

  // If no session token, redirect to login
  if (!sessionToken) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For page routes, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // For page routes: cookie existence is sufficient. The client-side
  // AuthContext validates the session via /api/auth/check on mount, and
  // Layout redirects to /login if isAuthenticated becomes false.
  //
  // Avoiding the internal HTTP fetch here fixes a race condition in Next.js
  // dev mode (Turbopack): the validate-session API route may execute in a
  // worker thread whose LokiJS instance hasn't loaded the newly-created
  // session from disk yet, causing a false 401 redirect on every page
  // navigation immediately after login.
  if (!pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    )
    return response
  }

  // For API routes: validate session token via internal API call.
  // API calls happen after page load, so the session has had time to persist
  // to disk and propagate across LokiJS instances.
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

  // Add security headers for all requests
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  )

  return response
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
