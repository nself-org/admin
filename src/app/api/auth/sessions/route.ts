import { getUserSessions } from '@/lib/auth-db'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { UAParser } from 'ua-parser-js'

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

    // Get all sessions for admin user
    const sessions = await getUserSessions('admin')

    // Parse user agents and format session data
    const formattedSessions = sessions.map((session) => {
      const parser = new UAParser(session.userAgent || '')
      const result = parser.getResult()

      return {
        token: session.token,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActive: session.lastActive,
        ip: session.ip || 'Unknown',
        rememberMe: session.rememberMe,
        isCurrent: session.token === sessionToken,
        device: {
          browser: result.browser.name || 'Unknown',
          browserVersion: result.browser.version || '',
          os: result.os.name || 'Unknown',
          osVersion: result.os.version || '',
          device: result.device.type || 'desktop',
          deviceModel: result.device.model || '',
        },
      }
    })

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sessions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
