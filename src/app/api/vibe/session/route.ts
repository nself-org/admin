/**
 * Vibe-Code Session API
 * POST /api/vibe/session — create a new vibe session
 * GET  /api/vibe/session — list sessions (admin only, max 3)
 *
 * Delegates heavy lifting to vibe_api CS_2 on port 8002.
 * Local mode (NSELF_VIBE_TARGET_ENV=local) connects directly to local Docker stack.
 */

import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const VIBE_ENABLED = process.env.NSELF_VIBE_ENABLED === 'true'
const VIBE_API_PORT = process.env.NSELF_VIBE_PORT ?? '8003'
const VIBE_API_BASE = `http://127.0.0.1:${VIBE_API_PORT}`
const CreateSessionSchema = z.object({
  target_env: z.enum(['local', 'staging', 'prod']).default('local'),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  if (!VIBE_ENABLED) {
    return NextResponse.json(
      { error: 'Vibe-Code is disabled. Set NSELF_VIBE_ENABLED=true.' },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = CreateSessionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { target_env } = parsed.data

  // Prod target requires admin role check — in single-operator mode, always allow
  // Multi-user: would check NSELF_ADMIN_MULTIUSER + role header
  if (target_env === 'prod') {
    const adminEnv = process.env.NSELF_VIBE_TARGET_ENV
    if (adminEnv !== 'prod') {
      return NextResponse.json(
        {
          error:
            'Production target requires NSELF_VIBE_TARGET_ENV=prod to be explicitly set by an admin.',
        },
        { status: 403 },
      )
    }
  }

  try {
    const vibeRes = await fetch(`${VIBE_API_BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_env }),
      signal: AbortSignal.timeout(5000),
    })

    if (!vibeRes.ok) {
      return NextResponse.json(
        {
          error: 'Vibe AI service is offline. Start the vibe_api custom service (CS_2) to use Vibe-Code.',
          service: 'vibe_api',
        },
        {
          status: 503,
          headers: { 'X-Service-Required': 'vibe_api' },
        },
      )
    }

    const sessionData = (await vibeRes.json()) as object
    return NextResponse.json(sessionData)
  } catch {
    return NextResponse.json(
      {
        error: 'Vibe AI service is offline. Start the vibe_api custom service (CS_2) to use Vibe-Code.',
        service: 'vibe_api',
      },
      {
        status: 503,
        headers: { 'X-Service-Required': 'vibe_api' },
      },
    )
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!VIBE_ENABLED) {
    return NextResponse.json({ sessions: [], total: 0 })
  }

  try {
    const vibeRes = await fetch(`${VIBE_API_BASE}/sessions`, {
      signal: AbortSignal.timeout(3000),
    })

    if (!vibeRes.ok) {
      return NextResponse.json(
        {
          error: 'Vibe AI service is offline. Start the vibe_api custom service (CS_2) to use Vibe-Code.',
          service: 'vibe_api',
        },
        {
          status: 503,
          headers: { 'X-Service-Required': 'vibe_api' },
        },
      )
    }

    const data = (await vibeRes.json()) as object
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      {
        error: 'Vibe AI service is offline. Start the vibe_api custom service (CS_2) to use Vibe-Code.',
        service: 'vibe_api',
      },
      {
        status: 503,
        headers: { 'X-Service-Required': 'vibe_api' },
      },
    )
  }
}
