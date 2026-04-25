import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const method = body.method || 'totp'

    if (!['totp', 'sms'].includes(method)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid MFA method',
          details: 'Method must be totp or sms',
        },
        { status: 400 },
      )
    }

    const args = ['mfa', 'enable', `--method=${method}`]
    const result = await executeNselfCommand('auth', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to enable MFA',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim(), method },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to enable MFA',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
