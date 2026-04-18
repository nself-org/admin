import { buildDashboard } from '@/features/projects/summary'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const data = await buildDashboard()
    return NextResponse.json(data)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to build dashboard.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
