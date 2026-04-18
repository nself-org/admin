import { loadSnapshot } from '@/features/cost/cost'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const snap = await loadSnapshot()
    return NextResponse.json(snap)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load snapshot.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
