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
      'member',
      'list',
      `--org=${id}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list members',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let members = []
    try {
      members = JSON.parse(result.stdout || '[]')
    } catch {
      members = []
    }

    return NextResponse.json({
      success: true,
      data: { members },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list members',
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
    const { email, role } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 },
      )
    }

    const args = ['org', 'member', 'add', `--org=${id}`, `--email=${email}`]
    if (role) args.push(`--role=${role}`)

    const result = await executeNselfCommand('tenant', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to add member',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { email, role: role || 'member' },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add member',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
