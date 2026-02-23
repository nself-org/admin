import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const result = await executeNselfCommand('tenant', [
      'member',
      'list',
      `--tenant=${id}`,
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

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const body = await request.json()
    const { email, role, message } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email',
          details: 'An email address is required',
        },
        { status: 400 },
      )
    }

    const args = ['member', 'add', `--tenant=${id}`, `--email=${email}`]
    if (role) args.push(`--role=${role}`)
    if (message) args.push(`--message=${message}`)

    const result = await executeNselfCommand('tenant', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to invite member',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { email, role: role || 'member', status: 'pending' },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to invite member',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
