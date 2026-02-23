import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const result = await executeNselfCommand('tenant', [
      'domain',
      'list',
      `--tenant=${id}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list domains',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let domains = []
    try {
      domains = JSON.parse(result.stdout || '[]')
    } catch {
      domains = []
    }

    return NextResponse.json({
      success: true,
      data: { domains },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list domains',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const body = await request.json()
    const { domain } = body

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid domain',
          details: 'A domain name is required',
        },
        { status: 400 },
      )
    }

    // Basic domain validation - simple check for dots and valid characters
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/
    if (!domainRegex.test(domain) || domain.length > 253) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid domain format',
          details: 'Please enter a valid domain name',
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('tenant', [
      'domain',
      'add',
      `--tenant=${id}`,
      `--domain=${domain}`,
      '--json',
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to add domain',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    let domainData = null
    try {
      domainData = JSON.parse(result.stdout || '{}')
    } catch {
      domainData = {
        id: `dom_${Date.now()}`,
        tenantId: id,
        domain,
        verified: false,
        ssl: false,
        primary: false,
        dnsRecords: [
          {
            type: 'CNAME',
            name: domain,
            value: 'cname.nself.app',
            verified: false,
          },
          {
            type: 'TXT',
            name: `_verify.${domain}`,
            value: `nself-verify=${id}`,
            verified: false,
          },
        ],
        createdAt: new Date().toISOString(),
      }
    }

    return NextResponse.json({
      success: true,
      data: domainData,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add domain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
