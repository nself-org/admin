/**
 * Pairing status route.
 *
 * GET ?sessionId=<id> → Returns { status: 'pending' | 'paired' | 'expired', token? }
 *
 * The status is tracked in the module-level session store populated by the
 * main pairing route (GET /api/auth/pairing) and the keychain route
 * (POST /api/auth/pairing/keychain) when a token is stored.
 */

import type { PairingStatusResponse } from '@/features/auth/types'
import { NextRequest, NextResponse } from 'next/server'
import { sessionStore } from '../../_store/sessions'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId query parameter is required' },
        { status: 400 },
      )
    }

    const entry = sessionStore.get(sessionId)

    if (!entry) {
      // Unknown session — treat as expired
      const body: PairingStatusResponse = {
        sessionId,
        status: 'expired',
      }
      return NextResponse.json(body)
    }

    const body: PairingStatusResponse = {
      sessionId,
      status: entry.status,
      ...(entry.status === 'paired' && entry.token
        ? { token: entry.token }
        : {}),
    }

    return NextResponse.json(body)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve pairing status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
