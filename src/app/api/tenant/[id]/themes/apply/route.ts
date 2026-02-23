import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const body = await request.json()
    const { themeId } = body

    if (!themeId) {
      return NextResponse.json(
        { success: false, error: 'Theme ID is required' },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('tenant', [
      'theme',
      'apply',
      `--tenant=${id}`,
      `--theme=${themeId}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to apply theme',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { themeId, applied: true },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to apply theme',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
