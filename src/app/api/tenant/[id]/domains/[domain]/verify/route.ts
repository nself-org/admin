import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string; domain: string }>
}

export async function POST(
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
      'verify',
      `--tenant=${id}`,
      `--domain=${decodedDomain}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to verify domain',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let verification = { verified: false, dnsRecords: [] }
    try {
      verification = JSON.parse(result.stdout || '{}')
    } catch {
      // Use defaults
    }

    return NextResponse.json({
      success: true,
      data: verification,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify domain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
