import * as dashboardsApi from '@/lib/dashboards'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId') || undefined

    const dashboards = await dashboardsApi.getDashboards(tenantId)

    return NextResponse.json({
      success: true,
      dashboards,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch dashboards',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Dashboard name is required',
        },
        { status: 400 },
      )
    }

    if (!body.createdBy || typeof body.createdBy !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'createdBy is required',
        },
        { status: 400 },
      )
    }

    const dashboard = await dashboardsApi.createDashboard(body)

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
          error instanceof Error ? error.message : 'Failed to create dashboard',
      },
      { status: 500 },
    )
  }
}
