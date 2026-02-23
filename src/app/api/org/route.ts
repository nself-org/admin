import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('tenant', [
      'org',
      'list',
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list organizations',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let organizations = []
    try {
      organizations = JSON.parse(result.stdout || '[]')
    } catch {
      organizations = []
    }

    return NextResponse.json({
      success: true,
      data: { organizations, total: organizations.length },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list organizations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { name, description, settings } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid organization name',
          details: 'An organization name is required',
        },
        { status: 400 },
      )
    }

    const args = ['org', 'create', `--name=${name}`]
    if (description) args.push(`--description=${description}`)
    if (settings) args.push(`--settings=${JSON.stringify(settings)}`)

    const result = await executeNselfCommand('tenant', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create organization',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let org = null
    try {
      org = JSON.parse(result.stdout || '{}')
    } catch {
      org = { name, slug: name.toLowerCase().replace(/\s+/g, '-') }
    }

    return NextResponse.json({
      success: true,
      data: org,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create organization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
