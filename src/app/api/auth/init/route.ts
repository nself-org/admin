import { appendAuditFile, extractSourceIp } from '@/lib/audit-file'
import {
  checkPasswordExists,
  isDevMode,
  rotateAdminSession,
  setupAdminPassword,
} from '@/lib/auth-db'
import { setCSRFCookie } from '@/lib/csrf'
import { addAuditLog } from '@/lib/database'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const passwordExists = await checkPasswordExists()
    const isDev = await isDevMode()

    return NextResponse.json({
      passwordExists,
      isDevEnv: isDev,
    })
  } catch (error) {
    console.error('Error checking password setup:', error)
    return NextResponse.json(
      { error: 'Failed to check password setup' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 },
      )
    }

    const isDev = await isDevMode()
    const result = await setupAdminPassword(password, isDev)

    if (result.success) {
      const sourceIp = extractSourceIp(request.headers)
      await addAuditLog('admin_password_set', { sourceIp }, true, 'admin')
      appendAuditFile({
        timestamp: new Date().toISOString(),
        user: 'admin',
        action: 'admin_password_set',
        sourceIp,
        success: true,
      })

      // S123-T03: rotate session token on privilege escalation.
      // If the wizard ran with an existing session cookie (e.g. re-setup),
      // replace it with a fresh token to prevent session fixation.
      const existingToken = request.cookies.get('nself-session')?.value
      if (existingToken) {
        const newSession = await rotateAdminSession(existingToken)
        if (newSession) {
          const response = NextResponse.json({
            success: true,
            message: 'Password set successfully',
          })
          response.cookies.set('nself-session', newSession.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
          })
          setCSRFCookie(response, newSession.csrfToken)
          return response
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Password set successfully',
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to set password' },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error('Error setting password:', error)
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 },
    )
  }
}
