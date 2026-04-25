/**
 * Hasura auto-track API endpoint
 * Tracks canvas tables via Hasura metadata API
 * SP-13.B20
 */

import {
  buildHasuraTrackTablePayload,
  type CanvasTable,
} from '@/lib/schema-builder'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = (await request.json()) as { tables?: CanvasTable[] }

    if (!Array.isArray(body.tables) || body.tables.length === 0) {
      return NextResponse.json(
        { success: false, error: 'tables array is required' },
        { status: 400 },
      )
    }

    // Read Hasura connection from env (set by nself build)
    const hasuraUrl =
      process.env.HASURA_GRAPHQL_URL ??
      process.env.NSELF_HASURA_URL ??
      'http://localhost:8080'

    const adminSecret =
      process.env.HASURA_GRAPHQL_ADMIN_SECRET ??
      process.env.NSELF_HASURA_ADMIN_SECRET ??
      ''

    if (!adminSecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            'HASURA_GRAPHQL_ADMIN_SECRET is not set. Ensure your nself stack is running.',
        },
        { status: 503 },
      )
    }

    const tracked: string[] = []
    const errors: string[] = []

    for (const table of body.tables) {
      if (!table.name?.trim()) continue
      try {
        const payload = buildHasuraTrackTablePayload({
          schema: table.schema || 'public',
          name: table.name,
        })
        const res = await fetch(`${hasuraUrl}/v1/metadata`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': adminSecret,
          },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const text = await res.text()
          // "already tracked" is not a failure
          if (text.includes('already tracked')) {
            tracked.push(table.name)
          } else {
            errors.push(`${table.name}: ${text}`)
          }
        } else {
          tracked.push(table.name)
        }
      } catch (err) {
        errors.push(
          `${table.name}: ${err instanceof Error ? err.message : 'network error'}`,
        )
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      tracked,
      errors,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track tables in Hasura',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
