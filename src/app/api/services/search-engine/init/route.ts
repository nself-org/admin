import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

const ALLOWED_ENGINES = [
  'meilisearch',
  'typesense',
  'sonic',
  'elasticsearch',
  'algolia',
]

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { engine } = body as { engine?: string }

    if (!engine || !ALLOWED_ENGINES.includes(engine)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid search engine',
          details: `Engine must be one of: ${ALLOWED_ENGINES.join(', ')}`,
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand(
      'service',
      ['search', 'init', `--engine=${engine}`],
      { timeout: 120000 },
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search engine initialization failed',
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
        error: 'Search engine initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
