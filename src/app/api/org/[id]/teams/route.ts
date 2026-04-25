import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

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
      'team',
      'list',
      `--org=${id}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list teams',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let teams = []
    try {
      teams = JSON.parse(result.stdout || '[]')
    } catch {
      teams = []
    }

    return NextResponse.json({
      success: true,
      data: { teams },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list teams',
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
    const { name, description, members } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Team name is required' },
        { status: 400 },
      )
    }

    const args = ['org', 'team', 'create', `--org=${id}`, `--name=${name}`]
    if (description) args.push(`--description=${description}`)
    if (members && Array.isArray(members)) {
      args.push(`--members=${members.join(',')}`)
    }

    const result = await executeNselfCommand('tenant', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create team',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let team = null
    try {
      team = JSON.parse(result.stdout || '{}')
    } catch {
      team = { name, slug: name.toLowerCase().replace(/\s+/g, '-') }
    }

    return NextResponse.json({
      success: true,
      data: team,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create team',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
