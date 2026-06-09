/**
 * /api/bus-factor — list and record bus-factor nominations.
 *
 * GET  → returns the canonical list of 13 critical accounts plus current
 *        nomination state (if any).
 * POST → records a new nomination, runs access pre-verification, writes to
 *        the audit log, and returns the saved row.
 *
 * P101 S10.T01. See lib/bus-factor.ts for the data model and adapters.
 */

import { extractSourceIp } from '@/lib/audit-file'
import {
  BUS_FACTOR_ACCOUNTS,
  listNominations,
  recordNomination,
  type NominationInput,
} from '@/lib/bus-factor'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  const nominations = listNominations()
  const byAccount = new Map(nominations.map((n) => [n.accountId, n]))
  return NextResponse.json({
    success: true,
    data: {
      accounts: BUS_FACTOR_ACCOUNTS.map((a) => ({
        ...a,
        nomination: byAccount.get(a.id) ?? null,
      })),
      nominations,
    },
  })
}

interface PostBody {
  accountId?: string
  nomineeHandle?: string
  nomineeEmail?: string
  role?: 'backup_admin' | 'observer'
  operatorConfirmed?: boolean
  operatorNotes?: string
  actor?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const errors: string[] = []
  if (!body.accountId) errors.push('accountId is required')
  if (!body.nomineeHandle) errors.push('nomineeHandle is required')
  if (!body.nomineeEmail) errors.push('nomineeEmail is required')
  if (!body.role || (body.role !== 'backup_admin' && body.role !== 'observer'))
    errors.push('role must be backup_admin or observer')
  if (typeof body.operatorConfirmed !== 'boolean')
    errors.push('operatorConfirmed must be a boolean')

  if (errors.length > 0) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: errors },
      { status: 400 }
    )
  }

  const account = BUS_FACTOR_ACCOUNTS.find((a) => a.id === body.accountId)
  if (!account) {
    return NextResponse.json(
      { success: false, error: `Unknown accountId: ${body.accountId}` },
      { status: 400 }
    )
  }

  const input: NominationInput = {
    accountId: body.accountId!,
    nomineeHandle: body.nomineeHandle!,
    nomineeEmail: body.nomineeEmail!,
    role: body.role!,
    operatorConfirmed: body.operatorConfirmed === true,
    operatorNotes: body.operatorNotes,
  }

  const actor = body.actor || extractSourceIp(request.headers) || 'unknown'

  try {
    const nomination = await recordNomination(input, actor)
    return NextResponse.json({ success: true, data: nomination })
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record nomination',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
