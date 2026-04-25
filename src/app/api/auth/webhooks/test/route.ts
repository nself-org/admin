import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

const VALID_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

/**
 * POST /api/auth/webhooks/test
 * Tests a webhook delivery via nself auth webhooks test --id=<id>
 * Body: { id: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { id } = body as { id?: string }

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Webhook ID is required' },
        { status: 400 },
      )
    }

    if (!VALID_ID_PATTERN.test(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook ID format' },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('auth', [
      'webhooks',
      'test',
      `--id=${id}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to test webhook',
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
        error: 'Failed to test webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
