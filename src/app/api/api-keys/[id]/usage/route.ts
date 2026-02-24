import * as apiKeysApi from '@/lib/api-keys'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/api-keys/[id]/usage - Get usage data for an API key
 * Query params:
 *   - limit?: number (default: 50)
 *   - offset?: number (default: 0)
 *   - startDate?: string (ISO date)
 *   - endDate?: string (ISO date)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

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

    // Verify the key exists
    const apiKey = await apiKeysApi.getApiKeyById(id)
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 },
      )
    }

    const usage = await apiKeysApi.getApiKeyUsage(id, {
      limit,
      offset,
      startDate,
      endDate,
    })

    return NextResponse.json({
      success: true,
      usage,
      pagination: {
        limit,
        offset,
        hasMore: usage.length === limit,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch API key usage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
