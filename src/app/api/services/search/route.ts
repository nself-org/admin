import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/services/search?query=<q>
 * Searches for services via nself service search --query=<q>
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Search query is required' },
        { status: 400 },
      )
    }

    // Sanitize query - only allow alphanumeric, spaces, hyphens, underscores
    const sanitized = query.trim().replace(/[^a-zA-Z0-9\s_-]/g, '')
    if (sanitized.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid search query' },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('service', [
      'search',
      `--query=${sanitized}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to search services',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { query: sanitized, output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search services',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
