import * as apiKeysApi from '@/lib/api-keys'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/api-keys/[id]/logs - Get audit logs for an API key
 * Query params:
 *   - limit?: number (default: 50)
 *   - offset?: number (default: 0)
 *   - action?: string (filter by action type)
 *
 * Action types: created, updated, activated, deactivated, revoked, used, rate_limited
 */
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const action = searchParams.get('action') || undefined

    // Validate limit and offset
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return NextResponse.json(
        { success: false, error: 'Invalid limit. Must be between 1 and 1000' },
        { status: 400 },
      )
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid offset. Must be 0 or greater' },
        { status: 400 },
      )
    }

    // Validate action filter if provided
    const validActions = [
      'created',
      'updated',
      'activated',
      'deactivated',
      'revoked',
      'used',
      'rate_limited',
    ]
    if (action && !validActions.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action filter. Must be one of: ${validActions.join(', ')}`,
        },
        { status: 400 },
      )
    }

    // Verify the key exists
    const apiKey = await apiKeysApi.getApiKeyById(id)
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 },
      )
    }

    const logs = await apiKeysApi.getApiKeyLogs(id, {
      limit,
      offset,
      action: action as
        | 'created'
        | 'updated'
        | 'activated'
        | 'deactivated'
        | 'revoked'
        | 'used'
        | 'rate_limited'
        | undefined,
    })

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        limit,
        offset,
        hasMore: logs.length === limit,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch API key logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
