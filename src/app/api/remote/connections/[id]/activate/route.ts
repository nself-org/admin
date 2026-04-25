import { setActiveConnection } from '@/features/remote/remote'
import type { RemoteError } from '@/features/remote/types'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const { id } = await context.params
  try {
    await setActiveConnection(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to activate.'
    const code = (err as RemoteError).code
    const status = code === 'NOT_FOUND' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
