import { NextResponse } from 'next/server'

interface AlertRoute {
  id: string
  name: string
  destination_type: string
  destination_config: Record<string, unknown>
  matchers: Array<{ key: string; op: string; value: string }>
  priority: number
  enabled: boolean
  created_at: string
}

interface AlertRoutesResponse {
  routes: AlertRoute[]
  total: number
}

const ALERT_ROUTER_URL = process.env.ALERT_ROUTER_URL ?? 'http://127.0.0.1:3834'

export async function GET() {
  try {
    const res = await fetch(`${ALERT_ROUTER_URL}/routes`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `alert-router upstream error: ${res.status}` },
        { status: res.status },
      )
    }

    const data = (await res.json()) as AlertRoutesResponse
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to reach nself-alert-router'

    // Return empty list when the plugin is not running so the admin UI
    // renders the "no routes configured" empty state instead of an error.
    if (
      msg.includes('ECONNREFUSED') ||
      msg.includes('fetch failed') ||
      msg.includes('timeout')
    ) {
      const empty: AlertRoutesResponse = { routes: [], total: 0 }
      return NextResponse.json(empty)
    }

    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
