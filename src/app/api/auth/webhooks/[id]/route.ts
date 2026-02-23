import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

const VALID_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

/**
 * GET /api/auth/webhooks/[id]
 * Shows details for a specific webhook via nself auth webhooks show <id>
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params

    if (!id || !VALID_ID_PATTERN.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook ID format' },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('auth', ['webhooks', 'show', id])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch webhook: ${id}`,
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { id, output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch webhook details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/auth/webhooks/[id]
 * Deletes a webhook via nself auth webhooks delete <id>
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params

    if (!id || !VALID_ID_PATTERN.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook ID format' },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('auth', ['webhooks', 'delete', id])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to delete webhook: ${id}`,
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { id, output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
