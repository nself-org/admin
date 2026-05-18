import { NextResponse } from 'next/server'

/**
 * GET /api/sentry/uptime
 * Proxies the nself-uptime-monitor plugin REST API (port 3831).
 * Returns honest empty when the plugin is not running.
 */

const UPTIME_MONITOR_URL = process.env.UPTIME_MONITOR_URL ?? 'http://127.0.0.1:3831'

export async function GET() {
  try {
    const res = await fetch(`${UPTIME_MONITOR_URL}/monitors`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `nself-uptime-monitor upstream error: ${res.status}` },
        { status: res.status }
      )
    }

    const data: unknown = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to reach nself-uptime-monitor'

    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout')) {
      return NextResponse.json({ monitors: [], generatedAt: new Date().toISOString() })
    }

    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
