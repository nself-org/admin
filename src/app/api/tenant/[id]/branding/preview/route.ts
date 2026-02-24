import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id } = await params
    const result = await executeNselfCommand('tenant', [
      'branding',
      'preview',
      `--tenant=${id}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get preview',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    // Generate preview URL (could be a temporary page with branding applied)
    const previewUrl = `/tenant/${id}/preview?t=${Date.now()}`

    return NextResponse.json({
      success: true,
      data: { previewUrl },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get preview',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
