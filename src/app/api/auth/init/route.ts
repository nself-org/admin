import {
  checkPasswordExists,
  isDevMode,
  setupAdminPassword,
} from '@/lib/auth-db'
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
