import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('auth', ['roles', 'list'])

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

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim() },
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { name, description, permissions } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid role name',
          details: 'A role name is required',
        },
        { status: 400 },
      )
    }

    if (
      !permissions ||
      !Array.isArray(permissions) ||
      permissions.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid permissions',
          details: 'At least one permission is required',
        },
        { status: 400 },
      )
    }

    const args = [
      'roles',
      'create',
      `--name=${name}`,
      `--permissions=${permissions.join(',')}`,
    ]
    if (description) {
      args.push(`--description=${description}`)
    }

    const result = await executeNselfCommand('auth', args)

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

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim(), name },
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
