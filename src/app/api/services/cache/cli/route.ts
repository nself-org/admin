import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { command } = body as { command?: string }

    if (
      !command ||
      typeof command !== 'string' ||
      command.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid command',
          details: 'A non-empty Redis CLI command is required',
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('service', [
      'cache',
      'cli',
      command.trim(),
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cache CLI command failed',
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
        error: 'Cache CLI command failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
