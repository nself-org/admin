import * as apiKeysApi from '@/lib/api-keys'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/api-keys/[id]/revoke - Revoke an API key
 * This sets the key status to 'revoked', making it permanently unusable.
 */
export async function POST(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const revoked = await apiKeysApi.revokeApiKey(id)

    if (!revoked) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to revoke API key',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
