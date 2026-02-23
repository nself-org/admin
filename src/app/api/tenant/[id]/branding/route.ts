import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const result = await executeNselfCommand('tenant', [
      'branding',
      'show',
      `--tenant=${id}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get branding',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let branding = {
      primaryColor: '#10b981',
      secondaryColor: '#1f2937',
      accentColor: '#3b82f6',
    }
    try {
      branding = JSON.parse(result.stdout || '{}')
    } catch {
      // Use defaults
    }

    return NextResponse.json({
      success: true,
      data: branding,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get branding',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
