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
      'org',
      'permission',
      'list',
      `--org=${id}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list permissions',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let permissions = []
    try {
      permissions = JSON.parse(result.stdout || '[]')
    } catch {
      permissions = []
    }

    return NextResponse.json({
      success: true,
      data: { permissions },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list permissions',
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
    const { permissions } = body

    if (!permissions || !Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, error: 'Permissions array is required' },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('tenant', [
      'org',
      'permission',
      'set',
      `--org=${id}`,
      `--permissions=${JSON.stringify(permissions)}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update permissions',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { permissions },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update permissions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
