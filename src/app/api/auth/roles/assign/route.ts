import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { role, userId } = body

    if (!role || typeof role !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid role',
          details: 'A role name is required',
        },
        { status: 400 },
      )
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid user ID',
          details: 'A user ID is required',
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('auth', [
      'roles',
      'assign',
      `--role=${role}`,
      `--user=${userId}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to assign role',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim(), role, userId },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to assign role',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
