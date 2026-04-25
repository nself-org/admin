import * as dashboardsApi from '@/lib/dashboards'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dashboard ID is required',
        },
        { status: 400 },
      )
    }

    const body = await request.json()
    const { name, tenantId, createdBy } = body

    const dashboard = await dashboardsApi.cloneDashboard(
      id,
      name,
      tenantId,
      createdBy,
    )

    if (!dashboard) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source dashboard not found',
        },
        { status: 404 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        dashboard,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to clone dashboard',
      },
      { status: 500 },
    )
  }
}
