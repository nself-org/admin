import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('tenant', ['list', '--json'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list tenants',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let tenants = []
    try {
      tenants = JSON.parse(result.stdout || '[]')
    } catch {
      // If not JSON, parse text output
      tenants = []
    }

    return NextResponse.json({
      success: true,
      data: { tenants, total: tenants.length },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list tenants',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { name, slug, plan, settings, branding } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid tenant name',
          details: 'A tenant name is required',
        },
        { status: 400 },
      )
    }

    const args = ['create', `--name=${name}`]

    if (slug) args.push(`--slug=${slug}`)
    if (plan) args.push(`--plan=${plan}`)
    if (settings) args.push(`--settings=${JSON.stringify(settings)}`)
    if (branding) args.push(`--branding=${JSON.stringify(branding)}`)

    const result = await executeNselfCommand('tenant', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create tenant',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let tenant = null
    try {
      tenant = JSON.parse(result.stdout || '{}')
    } catch {
      tenant = { name, slug: slug || name.toLowerCase().replace(/\s+/g, '-') }
    }

    return NextResponse.json({
      success: true,
      data: tenant,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
