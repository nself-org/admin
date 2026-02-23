import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string; uid: string }>
}

export async function POST(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id, uid } = await params
    const result = await executeNselfCommand('tenant', [
      'member',
      'resend-invite',
      `--tenant=${id}`,
      `--user=${uid}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to resend invite',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { userId: uid, inviteSent: true },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to resend invite',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
