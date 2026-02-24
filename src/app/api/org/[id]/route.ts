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
      'org',
      'show',
      id,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get organization',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let org = null
    try {
      org = JSON.parse(result.stdout || '{}')
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid organization data' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: org,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get organization',
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
    const { id } = await params
    const body = await request.json()
    const { name, description, settings } = body

    const args = ['org', 'update', id]
    if (name) args.push(`--name=${name}`)
    if (description) args.push(`--description=${description}`)
    if (settings) args.push(`--settings=${JSON.stringify(settings)}`)

    const result = await executeNselfCommand('tenant', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update organization',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { id, ...body },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update organization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id } = await params
    const result = await executeNselfCommand('tenant', [
      'org',
      'delete',
      id,
      '--confirm',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete organization',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { id, deleted: true },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete organization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
