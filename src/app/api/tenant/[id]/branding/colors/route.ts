import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id } = await params
    const body = await request.json()
    const { primaryColor, secondaryColor, accentColor } = body

    const args = ['branding', 'colors', `--tenant=${id}`]
    if (primaryColor) args.push(`--primary=${primaryColor}`)
    if (secondaryColor) args.push(`--secondary=${secondaryColor}`)
    if (accentColor) args.push(`--accent=${accentColor}`)

    const result = await executeNselfCommand('tenant', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update colors',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { primaryColor, secondaryColor, accentColor },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update colors',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
