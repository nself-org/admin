import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

const VALID_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

/**
 * GET /api/auth/webhooks/logs
 * Fetches webhook delivery logs via nself auth webhooks logs
 * Query params: ?id=<webhookId>&limit=50
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const limit = searchParams.get('limit')

    const args = ['webhooks', 'logs']

    if (id) {
      if (!VALID_ID_PATTERN.test(id)) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook ID format' },
          { status: 400 },
        )
      }
      args.push(`--id=${id}`)
    }

    if (limit) {
      const limitNum = parseInt(limit, 10)
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
        return NextResponse.json(
          {
            success: false,
            error: 'Limit must be a number between 1 and 500',
          },
          { status: 400 },
        )
      }
      args.push(`--limit=${limitNum}`)
    }

    const result = await executeNselfCommand('auth', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch webhook logs',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch webhook logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
