import { removeConnection } from '@/features/remote/remote'
import { NextResponse } from 'next/server'

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
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
