import * as activityApi from '@/lib/activity'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/activity/search - Search activities
 *
 * Query parameters:
 * - q: Search query string (required)
 * - limit: Maximum number of results (optional, default: 50)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Search query (q) is required' },
        { status: 400 },
      )
    }

    if (query.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Search query must be at least 2 characters' },
        { status: 400 },
      )
    }

    const results = await activityApi.searchActivity(query)

    // Apply limit
    const limitedResults = results.slice(0, limit)

    return NextResponse.json({
      success: true,
      data: {
        activities: limitedResults,
        total: results.length,
        query,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to search activities',
      },
      { status: 500 },
    )
  }
}
