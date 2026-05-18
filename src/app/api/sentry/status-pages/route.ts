import { NextResponse } from 'next/server'

/**
 * GET /api/sentry/status-pages
 * Proxies the nself-status-page plugin REST API (port 3832).
 * Returns honest empty when the plugin is not running.
 */

const STATUS_PAGE_URL = process.env.STATUS_PAGE_URL ?? 'http://127.0.0.1:3832'

export async function GET() {
  try {
    const res = await fetch(`${STATUS_PAGE_URL}/pages`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `nself-status-page upstream error: ${res.status}` },
        { status: res.status }
      )
    }

    const data: unknown = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to reach nself-status-page'

    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout')) {
      return NextResponse.json({ pages: [], generatedAt: new Date().toISOString() })
    }

    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
