import { validateSessionToken } from '@/lib/auth-db'
import { getSession } from '@/lib/database'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = request.cookies.get('nself-session')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No session' },
        { status: 401 },
      )
    }

    // Check if session exists and is valid in database
    const isValid = await validateSessionToken(token)

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 },
      )
    }

    // Get session details from database
    const session = await getSession(token)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 401 },
      )
    }

    // Session is valid
    return NextResponse.json({
      success: true,
      userId: session.userId,
      expiresAt: new Date(session.expiresAt).toISOString(),
    })
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Authentication check failed' },
      { status: 500 },
    )
  }
}
