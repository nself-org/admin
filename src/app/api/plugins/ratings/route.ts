/**
 * Plugin Ratings API Route — proxies the marketplace Worker.
 *
 * GET  /api/plugins/ratings
 *   Returns the full ratings map keyed by plugin name.
 *
 * POST /api/plugins/ratings
 *   Body: { plugin: string, stars: number (1-5), review?: string }
 *   Submits a rating + optional short review.
 */

import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

const MARKETPLACE_BASE =
  process.env.NSELF_MARKETPLACE_URL?.replace(/\/marketplace\/?$/, '') ||
  'https://plugins.nself.org'
const RATINGS_URL = `${MARKETPLACE_BASE}/ratings`

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(RATINGS_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'nself-admin' },
    })
    clearTimeout(timeoutId)
    const body = await response.json().catch(() => ({}))
    logger.api(
      'GET',
      '/api/plugins/ratings',
      response.status,
      Date.now() - startTime,
    )
    return NextResponse.json(
      {
        success: response.ok,
        ratings: body?.ratings || {},
      },
      { status: response.ok ? 200 : response.status },
    )
  } catch (err) {
    const e = err as { message?: string }
    logger.error('Ratings fetch failed', { error: e.message })
    return NextResponse.json(
      { success: false, ratings: {}, error: e.message || 'Fetch failed' },
      { status: 502 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const payload = body as { plugin?: string; stars?: number; review?: string }
  if (!payload?.plugin || typeof payload.stars !== 'number') {
    return NextResponse.json(
      { success: false, error: 'plugin and stars (1-5) required' },
      { status: 400 },
    )
  }
  if (payload.stars < 1 || payload.stars > 5) {
    return NextResponse.json(
      { success: false, error: 'stars must be between 1 and 5' },
      { status: 400 },
    )
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(RATINGS_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'nself-admin',
      },
      body: JSON.stringify({
        plugin: payload.plugin,
        stars: payload.stars,
        review: payload.review?.slice(0, 500),
      }),
    })
    clearTimeout(timeoutId)
    const result = await response.json().catch(() => ({}))
    logger.api(
      'POST',
      '/api/plugins/ratings',
      response.status,
      Date.now() - startTime,
    )
    return NextResponse.json(
      {
        success: Boolean(result?.ok),
        rating: result?.rating,
        error: result?.error,
      },
      { status: response.ok ? 200 : response.status },
    )
  } catch (err) {
    const e = err as { message?: string }
    logger.error('Ratings submit failed', { error: e.message })
    return NextResponse.json(
      { success: false, error: e.message || 'Submit failed' },
      { status: 502 },
    )
  }
}
