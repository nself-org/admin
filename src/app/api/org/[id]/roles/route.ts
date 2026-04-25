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
      'role',
      'list',
      `--org=${id}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list roles',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let roles = []
    try {
      roles = JSON.parse(result.stdout || '[]')
    } catch {
      roles = []
    }

    return NextResponse.json({
      success: true,
      data: { roles },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list roles',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, permissions } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Role name is required' },
        { status: 400 },
      )
    }

    const args = ['org', 'role', 'create', `--org=${id}`, `--name=${name}`]
    if (description) args.push(`--description=${description}`)
    if (permissions && Array.isArray(permissions)) {
      args.push(`--permissions=${permissions.join(',')}`)
    }

    const result = await executeNselfCommand('tenant', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create role',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let role = null
    try {
      role = JSON.parse(result.stdout || '{}')
    } catch {
      role = { name, slug: name.toLowerCase().replace(/\s+/g, '-') }
    }

    return NextResponse.json({
      success: true,
      data: role,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create role',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
