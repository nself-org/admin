import { NextResponse } from 'next/server'

/**
 * GET /api/sentry/slos
 * Proxies the nself-slo-tracker plugin REST API (port 3835).
 * Returns honest empty when the plugin is not running.
 */

const SLO_TRACKER_URL = process.env.SLO_TRACKER_URL ?? 'http://127.0.0.1:3835'

export async function GET() {
  try {
    const res = await fetch(`${SLO_TRACKER_URL}/slos`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `nself-slo-tracker upstream error: ${res.status}` },
        { status: res.status }
      )
    }

    const data: unknown = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to reach nself-slo-tracker'

    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout')) {
      return NextResponse.json({ slos: [], generatedAt: new Date().toISOString() })
    }

    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
