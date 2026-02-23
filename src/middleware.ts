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

  // Validate session token via internal API call
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
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } catch {
    // If validation fails, reject the request
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Session validation failed' },
        { status: 401 },
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
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
