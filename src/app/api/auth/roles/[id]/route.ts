import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params

    if (!ID_PATTERN.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid role ID',
          details: 'Role ID contains invalid characters',
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('auth', ['roles', 'show', id])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get role details',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim(), id },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get role details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params

    if (!ID_PATTERN.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid role ID',
          details: 'Role ID contains invalid characters',
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('auth', ['roles', 'remove', id])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to remove role',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim(), id },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove role',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
