import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

interface RouteParams {
  params: Promise<{ id: string; domain: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id, domain } = await params
    const decodedDomain = decodeURIComponent(domain)

    const result = await executeNselfCommand('tenant', [
      'domain',
      'show',
      `--tenant=${id}`,
      `--domain=${decodedDomain}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get domain',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let domainData = null
    try {
      domainData = JSON.parse(result.stdout || '{}')
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid domain data' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: domainData,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get domain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id, domain } = await params
    const decodedDomain = decodeURIComponent(domain)

    const result = await executeNselfCommand('tenant', [
      'domain',
      'remove',
      `--tenant=${id}`,
      `--domain=${decodedDomain}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to remove domain',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { domain: decodedDomain, removed: true },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove domain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
