import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const result = await executeNselfCommand('tenant', [
      'branding',
      'reset',
      `--tenant=${id}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to reset branding',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    const defaultBranding = {
      primaryColor: '#10b981',
      secondaryColor: '#1f2937',
      accentColor: '#3b82f6',
      logo: null,
      favicon: null,
    }

    return NextResponse.json({
      success: true,
      data: defaultBranding,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset branding',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
