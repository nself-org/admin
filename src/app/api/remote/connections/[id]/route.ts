import { removeConnection } from '@/features/remote/remote'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const { id } = await context.params
  try {
    const ok = await removeConnection(id)
    if (!ok) {
      return NextResponse.json(
        { error: 'Connection not found.' },
        { status: 404 },
      )
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
