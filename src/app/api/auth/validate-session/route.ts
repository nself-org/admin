import { getSession } from '@/lib/database'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Token required' },
        { status: 400 },
      )
    }

    // Validate token format (should be hex string)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { valid: false, error: 'Invalid token format' },
        { status: 400 },
      )
    }

    const session = await getSession(token)

    if (!session) {
      return NextResponse.json(
        { valid: false, error: 'Session not found or expired' },
        { status: 401 },
      )
    }

    // Check if session is expired (double-check, getSession should handle this)
    if (new Date(session.expiresAt) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Session expired' },
        { status: 401 },
      )
    }

    return NextResponse.json({
      valid: true,
      userId: session.userId,
      expiresAt: session.expiresAt,
    })
  } catch (error) {
    return NextResponse.json(
      {
        valid: false,
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
