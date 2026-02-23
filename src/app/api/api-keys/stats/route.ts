import * as apiKeysApi from '@/lib/api-keys'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/api-keys/stats - Get overall API key statistics
 * Returns:
 *   - totalKeys: number
 *   - activeKeys: number
 *   - expiredKeys: number
 *   - revokedKeys: number
 *   - byScope: Record<ApiKeyScope, number>
 *   - totalRequests24h: number
 *   - topKeys: { key: ApiKey, requests: number }[]
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const stats = await apiKeysApi.getApiKeyStats()

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch API key stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
