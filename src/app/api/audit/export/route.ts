import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl
    const format = searchParams.get('format') || 'json'

    if (format !== 'json' && format !== 'csv') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid format',
          details: 'Format must be "json" or "csv"',
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('audit', [
      '--export',
      `--format=${format}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to export audit log',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim(), format },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export audit log',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
