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
    const previewUrl = `/tenant/${id}/theme-preview?t=${Date.now()}`

    return NextResponse.json({
      success: true,
      data: { previewUrl },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get theme preview',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
