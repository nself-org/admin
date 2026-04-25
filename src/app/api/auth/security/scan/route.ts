import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { scope } = body as { scope?: 'full' | 'quick' }

    const args = ['security', 'scan']
    if (scope === 'full') {
      args.push('--full')
    }

    const timeout = scope === 'full' ? 120000 : 60000

    const result = await executeNselfCommand('auth', args, { timeout })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Security scan failed',
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
        error: 'Security scan failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
