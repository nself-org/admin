import { refreshSession } from '@/lib/auth-db'
import { setCSRFCookie } from '@/lib/csrf'
import { requireAuth } from '@/lib/require-auth'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'No session found' },
        { status: 401 },
      )
    }

    // Refresh the session
    const session = await refreshSession(sessionToken)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Failed to refresh session' },
        { status: 401 },
      )
    }

    // Create response with updated CSRF token
    const response = NextResponse.json({
      success: true,
      session: {
        expiresAt: session.expiresAt,
        lastActive: session.lastActive,
        rememberMe: session.rememberMe,
      },
    })

    // Update CSRF cookie with new token
    setCSRFCookie(response, session.csrfToken)

    return response
  } catch (error) {
    console.error('Error refreshing session:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
