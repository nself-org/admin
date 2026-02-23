import * as activityApi from '@/lib/activity'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/activity/stats - Get activity statistics
 *
 * Query parameters:
 * - tenantId: Optional tenant ID to filter stats
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenantId') || undefined

    const stats = await activityApi.getActivityStats(tenantId)

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch activity stats',
      },
      { status: 500 },
    )
  }
}
