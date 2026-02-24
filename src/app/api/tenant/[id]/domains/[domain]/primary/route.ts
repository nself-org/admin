import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string; domain: string }>
}

export async function PUT(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id, domain } = await params
    const decodedDomain = decodeURIComponent(domain)

    const result = await executeNselfCommand('tenant', [
      'domain',
      'primary',
      `--tenant=${id}`,
      `--domain=${decodedDomain}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to set primary domain',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { domain: decodedDomain, primary: true },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to set primary domain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
