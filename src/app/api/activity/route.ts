import * as activityApi from '@/lib/activity'
import type {
  ActivityAction,
  ActivityFeedOptions,
  ActivityFilter,
  ActivityResourceType,
} from '@/types/activity'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/activity - Get activity feed with filtering and pagination
 *
 * Query parameters:
 * - actorId: Filter by actor ID
 * - action: Filter by action type
 * - resourceType: Filter by resource type
 * - resourceId: Filter by resource ID
 * - tenantId: Filter by tenant ID
 * - startDate: Filter activities from this date (ISO string)
 * - endDate: Filter activities until this date (ISO string)
 * - search: Search query string
 * - limit: Number of results (default: 20)
 * - offset: Pagination offset (default: 0)
 * - cursor: Cursor-based pagination
 * - includeChanges: Include change details (default: false)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams

    // Build filter object with proper type casting
    const filter: ActivityFilter = {}

    const actorId = searchParams.get('actorId')
    if (actorId) filter.actorId = actorId

    const action = searchParams.get('action')
    if (action) filter.action = action as ActivityAction

    const resourceType = searchParams.get('resourceType')
    if (resourceType) filter.resourceType = resourceType as ActivityResourceType

    const resourceId = searchParams.get('resourceId')
    if (resourceId) filter.resourceId = resourceId

    const tenantId = searchParams.get('tenantId')
    if (tenantId) filter.tenantId = tenantId

    const startDate = searchParams.get('startDate')
    if (startDate) filter.startDate = startDate

    const endDate = searchParams.get('endDate')
    if (endDate) filter.endDate = endDate

    const search = searchParams.get('search')
    if (search) filter.search = search

    const rawLimit = parseInt(searchParams.get('limit') || '20', 10)
    const rawOffset = parseInt(searchParams.get('offset') || '0', 10)
    const limit = isNaN(rawLimit) ? 20 : Math.max(1, Math.min(rawLimit, 1000))
    const offset = isNaN(rawOffset) ? 0 : Math.max(0, rawOffset)

    const options: ActivityFeedOptions = {
      filter,
      limit,
      offset,
      cursor: searchParams.get('cursor') || undefined,
      includeChanges: searchParams.get('includeChanges') === 'true',
    }

    const result = await activityApi.getActivityFeed(options)

    return NextResponse.json({
      success: true,
      ...result,
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
