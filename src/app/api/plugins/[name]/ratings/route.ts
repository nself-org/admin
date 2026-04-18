/**
 * Per-plugin ratings API route
 *
 * GET  /api/plugins/[name]/ratings
 *   Proxies to https://plugins.nself.org/marketplace/ratings/{name}
 *   Returns: { name, rating, reviewCount, reviews }
 *   Cache-Control: max-age=60
 *
 * POST /api/plugins/[name]/ratings
 *   Body: { rating: number (1-5), comment?: string }
 *   Computes userHash server-side; never exposed to the browser.
 *   Proxies to POST https://plugins.nself.org/marketplace/ratings/{name}
 */

import { logger } from '@/lib/logger'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import os from 'os'

const MARKETPLACE_BASE =
  process.env.NSELF_MARKETPLACE_URL?.replace(/\/marketplace\/?$/, '') ??
  'https://plugins.nself.org'

/** Strict plugin name validation: lowercase alphanumeric + hyphens only */
const PLUGIN_NAME_RE = /^[a-z0-9-]+$/

interface RouteContext {
  params: Promise<{ name: string }>
}

/** Build a stable, anonymous user hash.
 *  Prefers NSELF_PLUGIN_LICENSE_KEY; falls back to hostname+platform.
 *  The hash is never sent to the browser.
 */
function buildUserHash(): string {
  const seed =
    process.env.NSELF_PLUGIN_LICENSE_KEY ??
    `${os.hostname()}:${process.platform}`
  return crypto.createHash('sha256').update(seed).digest('hex')
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const startTime = Date.now()
  const { name } = await context.params

  if (!PLUGIN_NAME_RE.test(name)) {
    return NextResponse.json(
      { success: false, error: 'Invalid plugin name' },
      { status: 400 },
    )
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    const url = `${MARKETPLACE_BASE}/marketplace/ratings/${encodeURIComponent(name)}`
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'nself-admin' },
    })
    clearTimeout(timeoutId)

    const body = await response.json().catch(() => ({}))
    logger.api('GET', `/api/plugins/${name}/ratings`, response.status, Date.now() - startTime)

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: body?.error ?? 'Upstream error' },
        { status: response.status },
      )
    }

    return NextResponse.json(
      {
        success: true,
        name: body.name ?? name,
        rating: typeof body.rating === 'number' ? body.rating : 0,
        reviewCount: typeof body.reviewCount === 'number' ? body.reviewCount : 0,
        reviews: Array.isArray(body.reviews) ? body.reviews : [],
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        },
      },
    )
  } catch (err) {
    const e = err as { message?: string }
    logger.error(`Ratings fetch failed for ${name}`, { error: e.message })
    return NextResponse.json(
      { success: false, error: e.message ?? 'Fetch failed' },
      { status: 502 },
    )
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const startTime = Date.now()
  const { name } = await context.params

  if (!PLUGIN_NAME_RE.test(name)) {
    return NextResponse.json(
      { success: false, error: 'Invalid plugin name' },
      { status: 400 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const payload = body as { rating?: unknown; comment?: unknown }

  if (typeof payload?.rating !== 'number' || !Number.isInteger(payload.rating)) {
    return NextResponse.json(
      { success: false, error: 'rating must be an integer' },
      { status: 400 },
    )
  }

  if (payload.rating < 1 || payload.rating > 5) {
    return NextResponse.json(
      { success: false, error: 'rating must be between 1 and 5' },
      { status: 400 },
    )
  }

  const comment =
    typeof payload.comment === 'string'
      ? payload.comment.slice(0, 500)
      : undefined

  const userHash = buildUserHash()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    const url = `${MARKETPLACE_BASE}/marketplace/ratings/${encodeURIComponent(name)}`
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'nself-admin',
      },
      body: JSON.stringify({ rating: payload.rating, comment, userHash }),
    })
    clearTimeout(timeoutId)

    const result = await response.json().catch(() => ({}))
    logger.api('POST', `/api/plugins/${name}/ratings`, response.status, Date.now() - startTime)

    return NextResponse.json(
      {
        success: response.ok,
        name: result.name ?? name,
        rating: result.rating,
        reviewCount: result.reviewCount,
        error: response.ok ? undefined : (result.error ?? 'Upstream error'),
      },
      { status: response.ok ? 200 : response.status },
    )
  } catch (err) {
    const e = err as { message?: string }
    logger.error(`Ratings submit failed for ${name}`, { error: e.message })
    return NextResponse.json(
      { success: false, error: e.message ?? 'Submit failed' },
      { status: 502 },
    )
  }
}
