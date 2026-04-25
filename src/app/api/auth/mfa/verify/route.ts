import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid code',
          details: 'A verification code is required',
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('auth', [
      'mfa',
      'verify',
      `--code=${code}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'MFA verification failed',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim(), verified: true },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'MFA verification failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
