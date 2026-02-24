import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id } = await params
    const result = await executeNselfCommand('tenant', [
      'email',
      'list',
      `--tenant=${id}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list email templates',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let templates = []
    try {
      templates = JSON.parse(result.stdout || '[]')
    } catch {
      templates = [
        {
          id: 'welcome',
          name: 'Welcome Email',
          subject: 'Welcome to {{tenant_name}}',
        },
        {
          id: 'invite',
          name: 'Member Invite',
          subject: "You've been invited to {{tenant_name}}",
        },
        {
          id: 'password-reset',
          name: 'Password Reset',
          subject: 'Reset your password',
        },
      ]
    }

    return NextResponse.json({
      success: true,
      data: { templates },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list email templates',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
