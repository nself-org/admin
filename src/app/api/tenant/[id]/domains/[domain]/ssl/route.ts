import { provisionSSLCertificate } from '@/lib/tenant/ssl-automation'
import { enforceTenantContext } from '@/lib/tenant/tenant-middleware'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string; domain: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id, domain } = await params
    const decodedDomain = decodeURIComponent(domain)

    // Enforce tenant context
    const tenantError = await enforceTenantContext(request, id)
    if (tenantError) return tenantError

    // Provision SSL certificate automatically
    const result = await provisionSSLCertificate(id, decodedDomain)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to provision SSL certificate',
          details: result.error || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ssl: result.ssl,
        expiresAt: result.expiresAt,
        certificatePath: result.certificatePath,
        keyPath: result.keyPath,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to provision SSL certificate',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id, domain } = await params
    const decodedDomain = decodeURIComponent(domain)

    // Enforce tenant context
    const tenantError = await enforceTenantContext(request, id)
    if (tenantError) return tenantError

    // Get SSL status
    const { getSSLStatus } = await import('@/lib/tenant/ssl-automation')
    const status = await getSSLStatus(id, decodedDomain)

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get SSL status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
