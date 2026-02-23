import { getSessionInfo } from '@/lib/auth-db'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      )
    }

    const session = await getSessionInfo(sessionToken)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 401 },
      )
    }

    return NextResponse.json({
      success: true,
      session: {
        expiresAt: session.expiresAt,
        lastActive: session.lastActive,
        rememberMe: session.rememberMe,
      },
    })
  } catch (error) {
    console.error('Error fetching session info:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch session info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
