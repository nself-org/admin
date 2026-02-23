import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const result = await executeNselfCommand('tenant', ['show', id, '--json'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get tenant',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let tenant = null
    try {
      tenant = JSON.parse(result.stdout || '{}')
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid tenant data' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: tenant,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, settings, branding } = body

    const args = ['update', id]

    if (name) args.push(`--name=${name}`)
    if (settings) args.push(`--settings=${JSON.stringify(settings)}`)
    if (branding) args.push(`--branding=${JSON.stringify(branding)}`)

    const result = await executeNselfCommand('tenant', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update tenant',
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
        error: 'Failed to update tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const result = await executeNselfCommand('tenant', [
      'delete',
      id,
      '--confirm',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete tenant',
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
        error: 'Failed to delete tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
