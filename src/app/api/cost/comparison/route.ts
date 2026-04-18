import { buildComparison, loadSnapshot } from '@/features/cost/cost'
import type { CostProvider } from '@/features/cost/types'
import { NextRequest, NextResponse } from 'next/server'

const VALID_PROVIDERS: CostProvider[] = [
  'hetzner',
  'aws',
  'gcp',
  'do',
  'vercel',
]

export async function GET(req: NextRequest) {
  try {
    const providerParam = req.nextUrl.searchParams.get('provider') ?? 'hetzner'
    if (!VALID_PROVIDERS.includes(providerParam as CostProvider)) {
      return NextResponse.json(
        { error: `Unknown provider: ${providerParam}` },
        { status: 400 },
      )
    }
    const provider = providerParam as CostProvider
    const snap = await loadSnapshot()
    const comparison = buildComparison(provider, snap.totalMonthlyUsd)
    return NextResponse.json(comparison)
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Failed to compute comparison.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
