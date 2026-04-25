import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

interface RouteParams {
  params: Promise<{ id: string; teamId: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id, teamId } = await params
    const result = await executeNselfCommand('tenant', [
      'org',
      'team',
      'show',
      `--org=${id}`,
      `--team=${teamId}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get team',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let team = null
    try {
      team = JSON.parse(result.stdout || '{}')
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid team data' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: team,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get team',
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
    const { id, teamId } = await params
    const body = await request.json()
    const { name, description, members } = body

    const args = ['org', 'team', 'update', `--org=${id}`, `--team=${teamId}`]
    if (name) args.push(`--name=${name}`)
    if (description) args.push(`--description=${description}`)
    if (members && Array.isArray(members)) {
      args.push(`--members=${members.join(',')}`)
    }

    const result = await executeNselfCommand('tenant', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update team',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { teamId, ...body },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update team',
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
    const { id, teamId } = await params
    const result = await executeNselfCommand('tenant', [
      'org',
      'team',
      'delete',
      `--org=${id}`,
      `--team=${teamId}`,
      '--confirm',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete team',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { teamId, deleted: true },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete team',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
