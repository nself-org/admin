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
      'theme',
      'list',
      `--tenant=${id}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list themes',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let themes = []
    try {
      themes = JSON.parse(result.stdout || '[]')
    } catch {
      // Default themes
      themes = [
        {
          id: 'default',
          name: 'Default',
          description: 'Standard nself theme',
          isDefault: true,
        },
        {
          id: 'dark',
          name: 'Dark Mode',
          description: 'Dark color scheme',
          isDefault: false,
        },
        {
          id: 'light',
          name: 'Light Mode',
          description: 'Light color scheme',
          isDefault: false,
        },
      ]
    }

    return NextResponse.json({
      success: true,
      data: { themes },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list themes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
