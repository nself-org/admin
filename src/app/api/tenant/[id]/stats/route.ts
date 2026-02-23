import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const result = await executeNselfCommand('tenant', ['stats', id, '--json'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get tenant stats',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let stats = { members: 0, storage: 0, apiCalls: 0, domains: 0 }
    try {
      stats = JSON.parse(result.stdout || '{}')
    } catch {
      // Use defaults
    }

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get tenant stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
