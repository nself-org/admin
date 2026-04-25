import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

interface RouteParams {
  params: Promise<{ id: string; roleId: string }>
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id, roleId } = await params
    const body = await request.json()
    const { name, description, permissions } = body

    const args = ['org', 'role', 'update', `--org=${id}`, `--role=${roleId}`]
    if (name) args.push(`--name=${name}`)
    if (description) args.push(`--description=${description}`)
    if (permissions && Array.isArray(permissions)) {
      args.push(`--permissions=${permissions.join(',')}`)
    }

    const result = await executeNselfCommand('tenant', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update role',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { roleId, ...body },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update role',
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
    const { id, roleId } = await params
    const result = await executeNselfCommand('tenant', [
      'org',
      'role',
      'delete',
      `--org=${id}`,
      `--role=${roleId}`,
      '--confirm',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete role',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { roleId, deleted: true },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete role',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
