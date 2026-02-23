import * as apiKeysApi from '@/lib/api-keys'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/api-keys/[id] - Get a single API key by ID
 */
export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const apiKey = await apiKeysApi.getApiKeyById(id)

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      apiKey,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch API key',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/api-keys/[id] - Update an API key
 * Body (all optional):
 *   - name?: string
 *   - description?: string
 *   - status?: ApiKeyStatus
 *   - rateLimit?: { requests: number, window: number }
 *   - allowedIps?: string[]
 *   - allowedOrigins?: string[]
 *   - permissions?: ApiKeyPermission[]
 *   - expiresAt?: string
 */
export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate status if provided
    if (body.status) {
      const validStatuses = ['active', 'inactive', 'expired', 'revoked']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          },
          { status: 400 },
        )
      }
    }

    // Only allow specific fields to be updated
    const allowedUpdates = [
      'name',
      'description',
      'status',
      'rateLimit',
      'allowedIps',
      'allowedOrigins',
      'permissions',
      'expiresAt',
    ]

    const updates: Record<string, unknown> = {}
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 },
      )
    }

    const updatedKey = await apiKeysApi.updateApiKey(id, updates)

    if (!updatedKey) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      apiKey: updatedKey,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update API key',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/api-keys/[id] - Delete an API key permanently
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params
    const deleted = await apiKeysApi.deleteApiKey(id)

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete API key',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
