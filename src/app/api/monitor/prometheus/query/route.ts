import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { query, range } = await request.json()

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 },
      )
    }

    // Mock data - in production, this would query actual Prometheus
    const now = Date.now()
    const points = range === '5m' ? 10 : range === '1h' ? 60 : 24
    const interval = range === '5m' ? 30000 : range === '1h' ? 60000 : 3600000

    const results = Array.from({ length: points }, (_, i) => ({
      timestamp: new Date(now - (points - i) * interval).toISOString(),
      value: Math.random() * 100,
    }))

    return NextResponse.json({
      success: true,
      results,
      query,
      range,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute query',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
