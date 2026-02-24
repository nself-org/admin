import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string; name: string }>
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id, name } = await params
    const result = await executeNselfCommand('tenant', [
      'email',
      'show',
      `--tenant=${id}`,
      `--template=${name}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get email template',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let template = null
    try {
      template = JSON.parse(result.stdout || '{}')
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid template data' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: template,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get email template',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id, name } = await params
    const body = await request.json()
    const { subject, htmlContent, textContent } = body

    const result = await executeNselfCommand('tenant', [
      'email',
      'edit',
      `--tenant=${id}`,
      `--template=${name}`,
      `--subject=${subject || ''}`,
      `--html=${htmlContent || ''}`,
      `--text=${textContent || ''}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update email template',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { name, ...body, updatedAt: new Date().toISOString() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update email template',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
