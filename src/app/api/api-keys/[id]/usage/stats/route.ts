import * as apiKeysApi from '@/lib/api-keys'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/api-keys/[id]/usage/stats - Get usage statistics for an API key
 * Returns aggregated statistics including:
 *   - Total requests
 *   - Success/failure counts
 *   - Average response time
 *   - Requests by endpoint
 *   - Requests by status code
 *   - Requests by hour (last 24h)
 *   - Top endpoints
 *   - Error rate
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id } = await params

    // Verify the key exists
    const apiKey = await apiKeysApi.getApiKeyById(id)
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 },
      )
    }

    const stats = await apiKeysApi.getApiKeyUsageStats(id)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch API key usage stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
