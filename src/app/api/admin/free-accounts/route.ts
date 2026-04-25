/**
 * GET /api/admin/free-accounts — Free-plugin cohort table (S20)
 *
 * Proxies to ping_api GET /admin/free-accounts using the server-side admin secret.
 * Query params: ?filter=all|flagged|converted
 */

import { NextRequest, NextResponse } from 'next/server'

const PING_API_URL =
  process.env.NEXT_PUBLIC_PING_API_URL?.replace(/\/$/, '') ??
  'https://ping.nself.org'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminSecret =
    process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? process.env.ADMIN_SECRET ?? ''

  if (!adminSecret) {
    return NextResponse.json(
      { error: 'Admin secret not configured' },
      { status: 503 },
    )
  }

  const filter = request.nextUrl.searchParams.get('filter') ?? 'all'

  try {
    const upstream = await fetch(
      `${PING_API_URL}/admin/free-accounts?filter=${encodeURIComponent(filter)}`,
      {
        headers: { 'x-admin-secret': adminSecret },
        signal: AbortSignal.timeout(10_000),
      },
    )

    if (upstream.status === 401 || upstream.status === 403) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await upstream.json()
    return NextResponse.json(data, { status: upstream.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Upstream error: ${message}` },
      { status: 502 },
    )
  }
}
