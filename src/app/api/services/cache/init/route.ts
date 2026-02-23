import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('service', ['cache', 'init'], {
      timeout: 120000,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cache initialization failed',
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
        error: 'Cache initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
