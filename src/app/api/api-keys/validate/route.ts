import * as apiKeysApi from '@/lib/api-keys'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/api-keys/validate - Validate an API key
 * Body:
 *   - key: string (the full API key to validate)
 *
 * Returns:
 *   - valid: boolean
 *   - key?: ApiKey (if valid, returns the key metadata)
 *   - error?: string (if invalid, returns the reason)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()

    if (!body.key) {
      return NextResponse.json(
        { success: false, error: 'key is required' },
        { status: 400 },
      )
    }

    const result = await apiKeysApi.validateApiKey(body.key)

    if (!result.valid) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: result.error,
      })
    }

    return NextResponse.json({
      success: true,
      valid: true,
      key: result.key,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate API key',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
