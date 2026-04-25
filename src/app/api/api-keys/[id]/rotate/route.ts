import * as apiKeysApi from '@/lib/api-keys'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/api-keys/[id]/rotate - Rotate an API key
 * Generates a new secure key while maintaining permissions and settings
 * Returns the new secret key (one-time only)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params
    const result = await apiKeysApi.rotateApiKey(id)

    return NextResponse.json({
      success: true,
      key: result.key,
      secretKey: result.secretKey, // Only shown once!
      message:
        'API key rotated successfully. Save the new key - it will not be shown again.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to rotate API key',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status:
          error instanceof Error && error.message === 'API key not found'
            ? 404
            : 500,
      },
    )
  }
}
