/**
 * POST /api/admin/free-accounts/run-antisharing-cron (S20)
 *
 * Proxies to ping_api POST /admin/free-accounts/run-antisharing-cron.
 * Triggers the anti-sharing key detection cron on demand.
 */

import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

const PING_API_URL =
  process.env.NEXT_PUBLIC_PING_API_URL?.replace(/\/$/, '') ??
  'https://ping.nself.org'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  const adminSecret =
    process.env.HASURA_GRAPHQL_ADMIN_SECRET ?? process.env.ADMIN_SECRET ?? ''

  if (!adminSecret) {
    return NextResponse.json(
      { error: 'Admin secret not configured' },
      { status: 503 },
    )
  }

  try {
    const upstream = await fetch(
      `${PING_API_URL}/admin/free-accounts/run-antisharing-cron`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: '{}',
        signal: AbortSignal.timeout(30_000),
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
