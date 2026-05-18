import { NextResponse } from 'next/server'

/**
 * GET /api/sentry/incidents
 * Proxies the nself-incident-mgmt plugin REST API (port 3833).
 * Returns honest empty when the plugin is not running.
 */

const INCIDENT_MGMT_URL = process.env.INCIDENT_MGMT_URL ?? 'http://127.0.0.1:3833'

export async function GET() {
  try {
    const res = await fetch(`${INCIDENT_MGMT_URL}/incidents`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `nself-incident-mgmt upstream error: ${res.status}` },
        { status: res.status }
      )
    }

    const data: unknown = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to reach nself-incident-mgmt'

    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout')) {
      return NextResponse.json({ incidents: [], generatedAt: new Date().toISOString() })
    }

    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
