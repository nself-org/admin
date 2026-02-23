import * as apiKeysApi from '@/lib/api-keys'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/api-keys/[id]/rate-limit - Get current rate limit status for an API key
 * Returns:
 *   - keyId: string
 *   - currentRequests: number
 *   - limit: number
 *   - window: number (seconds)
 *   - resetAt: string (ISO date)
 *   - isLimited: boolean
 */
export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
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

    const rateLimit = await apiKeysApi.getApiKeyRateLimit(id)

    if (!rateLimit) {
      return NextResponse.json({
        success: true,
        rateLimit: null,
        message: 'No rate limit configured for this API key',
      })
    }

    return NextResponse.json({
      success: true,
      rateLimit,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch API key rate limit',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
