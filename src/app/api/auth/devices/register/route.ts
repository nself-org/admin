import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { name, type } = body as { name?: string; type?: string }

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Device name is required' },
        { status: 400 },
      )
    }

    // Validate name format
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid device name. Only letters, numbers, hyphens, and underscores are allowed.',
        },
        { status: 400 },
      )
    }

    const args = ['devices', 'register', `--name=${name}`]
    if (type) {
      args.push(`--type=${type}`)
    }

    const result = await executeNselfCommand('auth', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to register device',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to register device',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
