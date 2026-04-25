import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string; uid: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id, uid } = await params
    const result = await executeNselfCommand('tenant', [
      'member',
      'show',
      `--tenant=${id}`,
      `--user=${uid}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get member',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let member = null
    try {
      member = JSON.parse(result.stdout || '{}')
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid member data' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: member,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get member',
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
    const { id, uid } = await params
    const body = await request.json()
    const { role } = body

    if (!role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid role',
          details: 'A role is required',
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('tenant', [
      'member',
      'update',
      `--tenant=${id}`,
      `--user=${uid}`,
      `--role=${role}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update member role',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { userId: uid, role },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update member role',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id, uid } = await params
    const result = await executeNselfCommand('tenant', [
      'member',
      'remove',
      `--tenant=${id}`,
      `--user=${uid}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to remove member',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { userId: uid, removed: true },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove member',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
