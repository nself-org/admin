import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * Proxy for mux plugin rule endpoints.
 * Routes GET/POST/PATCH/DELETE to http://${MUX_URL}/mux/rules
 */

const MUX_URL = process.env.MUX_URL || 'localhost:3711'

function muxBase(): string {
  return `http://${MUX_URL}`
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const res = await fetch(`${muxBase()}/mux/rules`)
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Mux plugin is not reachable' },
        { status: res.status },
      )
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (_err) {
    return NextResponse.json(
      { error: 'Mux plugin is not running' },
      { status: 503 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const res = await fetch(`${muxBase()}/mux/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (_err) {
    return NextResponse.json(
      { error: 'Mux plugin is not running' },
      { status: 503 },
    )
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const ruleId = body?.id
    if (!ruleId) {
      return NextResponse.json({ error: 'Missing rule id' }, { status: 400 })
    }
    const { id: _id, ...payload } = body
    const res = await fetch(`${muxBase()}/mux/rules/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (_err) {
    return NextResponse.json(
      { error: 'Mux plugin is not running' },
      { status: 503 },
    )
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('id')
    if (!ruleId) {
      return NextResponse.json(
        { error: 'Missing rule id query param' },
        { status: 400 },
      )
    }
    const res = await fetch(`${muxBase()}/mux/rules/${ruleId}`, {
      method: 'DELETE',
    })
    if (res.status === 204 || res.ok) {
      return NextResponse.json({ ok: true })
    }
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (_err) {
    return NextResponse.json(
      { error: 'Mux plugin is not running' },
      { status: 503 },
    )
  }
}
