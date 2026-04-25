import * as activityApi from '@/lib/activity'
import type { ActivityFilter } from '@/types/activity'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * POST /api/activity/export - Export activities
 *
 * Request body:
 * - format: 'json' | 'csv' (default: 'json')
 * - filter: ActivityFilter object (optional)
 *   - actorId: Filter by actor ID
 *   - action: Filter by action type
 *   - resourceType: Filter by resource type
 *   - resourceId: Filter by resource ID
 *   - tenantId: Filter by tenant ID
 *   - startDate: Filter activities from this date
 *   - endDate: Filter activities until this date
 *   - search: Search query string
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const format = body.format === 'csv' ? 'csv' : 'json'
    const filter: ActivityFilter = body.filter || {}

    const exportData = await activityApi.exportActivity(filter, format)

    // Set appropriate content type and headers based on format
    if (format === 'csv') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      return new NextResponse(exportData, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="activity-export-${timestamp}.csv"`,
        },
      })
    }

    // JSON format - return as downloadable file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return new NextResponse(exportData, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="activity-export-${timestamp}.json"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to export activities',
      },
      { status: 500 },
    )
  }
}
