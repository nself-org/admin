import { revokeAllOtherSessions, revokeUserSession } from '@/lib/auth-db'
import { validateCSRFToken } from '@/lib/csrf'
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
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      )
    }

    // Validate CSRF token
    const csrfValid = await validateCSRFToken(request, sessionToken)
    if (!csrfValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid CSRF token' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { token, revokeAll } = body

    if (revokeAll) {
      // Revoke all sessions except current
      const count = await revokeAllOtherSessions('admin', sessionToken)

      return NextResponse.json({
        success: true,
        message: `${count} session(s) revoked`,
        count,
      })
    } else if (token) {
      // Revoke specific session
      if (token === sessionToken) {
        return NextResponse.json(
          { success: false, error: 'Cannot revoke current session' },
          { status: 400 },
        )
      }

      await revokeUserSession(token)

      return NextResponse.json({
        success: true,
        message: 'Session revoked',
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing token or revokeAll parameter' },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error('Error revoking session:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to revoke session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
