import * as activityApi from '@/lib/activity'
import { NextResponse } from 'next/server'

/**
 * GET /api/activity/[id] - Get a single activity by ID
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Activity ID is required' },
        { status: 400 },
      )
    }

    const activity = await activityApi.getActivityById(id)

    if (!activity) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: activity,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch activity',
      },
      { status: 500 },
    )
  }
}
