import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { query, range } = await request.json()

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 })
    }

    const promUrl = process.env.PROMETHEUS_URL || process.env.NSELF_PROMETHEUS_URL
    if (!promUrl) {
      return NextResponse.json({
        success: true,
        results: [],
        query,
        range,
        note: 'prometheus-not-configured',
      })
    }

    // Map range to Prometheus step
    const now = Math.floor(Date.now() / 1000)
    const rangeSeconds = range === '5m' ? 300 : range === '1h' ? 3600 : 86400
    const start = now - rangeSeconds
    const step = range === '5m' ? '30s' : range === '1h' ? '60s' : '3600s'

    const params = new URLSearchParams({
      query,
      start: String(start),
      end: String(now),
      step,
    })

    const promResponse = await fetch(`${promUrl.replace(/\/$/, '')}/api/v1/query_range?${params}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })

    if (!promResponse.ok) {
      const text = await promResponse.text()
      return NextResponse.json(
        {
          success: false,
          error: `Prometheus returned ${promResponse.status}`,
          details: text.slice(0, 500),
        },
        { status: 502 }
      )
    }

    const promData = await promResponse.json()

    // Flatten matrix result into flat time-series array
    const results: { timestamp: string; value: number }[] = []
    const matrixResult: Array<{ metric: Record<string, string>; values: [number, string][] }> =
      promData?.data?.result ?? []

    for (const series of matrixResult) {
      for (const [ts, val] of series.values) {
        results.push({
          timestamp: new Date(ts * 1000).toISOString(),
          value: parseFloat(val),
        })
      }
    }

    // If multiple series returned, caller receives merged flat array
    results.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

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
      { status: 500 }
    )
  }
}
