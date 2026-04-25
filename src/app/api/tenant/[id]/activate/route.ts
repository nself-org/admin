import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const result = await executeNselfCommand('tenant', ['activate', id])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to activate tenant',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { id, status: 'active' },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to activate tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
