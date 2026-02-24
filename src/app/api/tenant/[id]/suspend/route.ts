import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id } = await params
    const result = await executeNselfCommand('tenant', ['suspend', id])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to suspend tenant',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { id, status: 'suspended' },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to suspend tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
