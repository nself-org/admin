import * as dashboardsApi from '@/lib/dashboards'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId') || undefined

    const stats = await dashboardsApi.getDashboardStats(tenantId)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch dashboard stats',
      },
      { status: 500 },
    )
  }
}
