import { getTenant } from '@/lib/database'
import { switchTenant } from '@/lib/tenant/tenant-context'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { tenantId } = body

    if (!tenantId || typeof tenantId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid tenant ID',
          details: 'A valid tenant ID is required',
        },
        { status: 400 },
      )
    }

    // Verify tenant exists
    const tenant = await getTenant(tenantId)
    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
          details: 'The specified tenant does not exist',
        },
        { status: 404 },
      )
    }

    // Switch to the tenant
    await switchTenant(tenantId)

    return NextResponse.json({
      success: true,
      data: {
        tenantId,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to switch tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
