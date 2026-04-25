import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id } = await params
    const result = await executeNselfCommand('tenant', [
      'settings',
      'list',
      `--tenant=${id}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get settings',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let settings = {}
    try {
      settings = JSON.parse(result.stdout || '{}')
    } catch {
      settings = {}
    }

    return NextResponse.json({
      success: true,
      data: { settings },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()

    const result = await executeNselfCommand('tenant', [
      'settings',
      'set',
      `--tenant=${id}`,
      `--config=${JSON.stringify(body)}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update settings',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { settings: body },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
