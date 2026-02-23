import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { to } = body as { to?: string }

    const args = ['email', 'test']
    if (to) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email address format' },
          { status: 400 },
        )
      }
      args.push(`--to=${to}`)
    }

    const result = await executeNselfCommand('service', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email test failed',
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
        error: 'Email test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
