import {
  getAdminPasswordHash,
  getSession,
  hasAdminPassword,
} from '@/lib/database'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  // This is a debug endpoint, only available in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 404 },
    )
  }

  const token = request.cookies.get('nself-session')?.value
  const csrfToken = request.cookies.get('nself-csrf')?.value

  const passwordExists = await hasAdminPassword()
  const passwordHash = await getAdminPasswordHash()

  let sessionInfo = null
  if (token) {
    const session = await getSession(token)
    if (session) {
      sessionInfo = {
        userId: session.userId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        expired: new Date() > new Date(session.expiresAt),
      }
    }
  }

  return NextResponse.json({
    cookies: {
      sessionToken: token ? `${token.substring(0, 10)}...` : null,
      csrfToken: csrfToken ? `${csrfToken.substring(0, 10)}...` : null,
    },
    database: {
      passwordExists,
      passwordHashLength: passwordHash ? passwordHash.length : 0,
    },
    session: sessionInfo,
    timestamp: new Date().toISOString(),
  })
}
