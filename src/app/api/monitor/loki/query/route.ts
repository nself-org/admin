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

    const lokiUrl = process.env.LOKI_URL || process.env.NSELF_LOKI_URL
    if (!lokiUrl) {
      return NextResponse.json({
        success: true,
        logs: [],
        query,
        range,
        note: 'loki-not-configured',
      })
    }

    // Map range to Loki time window
    const now = Math.floor(Date.now() / 1000)
    const rangeSeconds = range === '5m' ? 300 : range === '1h' ? 3600 : 86400
    const start = (now - rangeSeconds) * 1_000_000_000 // nanoseconds
    const end = now * 1_000_000_000

    const params = new URLSearchParams({
      query,
      start: String(start),
      end: String(end),
      limit: '500',
      direction: 'BACKWARD',
    })

    const lokiResponse = await fetch(
      `${lokiUrl.replace(/\/$/, '')}/loki/api/v1/query_range?${params}`,
      {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10_000),
      }
    )

    if (!lokiResponse.ok) {
      const text = await lokiResponse.text()
      return NextResponse.json(
        {
          success: false,
          error: `Loki returned ${lokiResponse.status}`,
          details: text.slice(0, 500),
        },
        { status: 502 }
      )
    }

    const lokiData = await lokiResponse.json()

    // Flatten Loki streams into log entries
    const logs: { timestamp: string; level: string; service: string; message: string }[] = []
    const streams: Array<{ stream: Record<string, string>; values: [string, string][] }> =
      lokiData?.data?.result ?? []

    for (const stream of streams) {
      const service = stream.stream?.service_name ?? stream.stream?.job ?? 'unknown'
      const level = stream.stream?.level ?? stream.stream?.severity ?? 'info'
      for (const [nanoTs, line] of stream.values) {
        logs.push({
          timestamp: new Date(Math.floor(Number(nanoTs) / 1_000_000)).toISOString(),
          level,
          service,
          message: line,
        })
      }
    }

    // Sort ascending by timestamp
    logs.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    return NextResponse.json({
      success: true,
      logs,
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
