import { NextRequest, NextResponse } from 'next/server'

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/init', // Allow init pages for project setup
  '/api/auth/login',
  '/api/auth/init',
  '/api/auth/csrf', // CSRF token must be fetchable before login (no session yet)
  '/api/auth/check', // Allow checking auth status
  '/api/auth/validate-session', // Allow session validation from middleware
  '/api/health',
  '/api/project/status', // Allow checking project status without auth
  '/api/wizard', // Allow all wizard endpoints
  '/api/env/read', // Allow reading env during wizard
  '/_next',
  '/favicon.ico',
  '/site.webmanifest',
  '/sw.js',
]

// Define API routes that should be protected
const PROTECTED_API_ROUTES = [
  '/api/docker',
  '/api/services',
  '/api/database',
  '/api/config',
  '/api/system',
  '/api/project',
  '/api/nself',
  '/api/storage',
  '/api/monitoring',
  '/api/graphql',
  '/api/redis',
  '/api/cli',
  '/api/backup',
  '/api/deploy',
  '/api/environments',
  '/api/cloud',
  '/api/k8s',
  '/api/helm',
  '/api/frontend',
  '/api/benchmark',
  '/api/logs',
  '/api/scale',
  '/api/performance',
  '/api/plugins',
  '/api/version',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
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
