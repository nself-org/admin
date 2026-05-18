import { NextResponse } from 'next/server'

/**
 * GET /api/sentry/rum
 * Proxies the nself-rum plugin REST API (port 3837).
 * Returns honest empty metrics when the plugin is not running.
 */

const RUM_URL = process.env.RUM_URL ?? 'http://127.0.0.1:3837'

export async function GET() {
  try {
    const res = await fetch(`${RUM_URL}/metrics`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `nself-rum upstream error: ${res.status}` },
        { status: res.status }
      )
    }

    const data: unknown = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to reach nself-rum'

    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout')) {
      return NextResponse.json({
        eventCount24h: 0,
        activeSessionCount: 0,
        p50LoadMs: 0,
        p95LoadMs: 0,
        topErrors: [],
        recentSession: null,
        generatedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
