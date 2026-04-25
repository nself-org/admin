import { loadConnections, testConnection } from '@/features/remote/remote'
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
    const store = await loadConnections()
    const conn = store.connections.find((c) => c.id === id)
    if (conn === undefined) {
      return NextResponse.json(
        { error: 'Connection not found.' },
        { status: 404 },
      )
    }
    const result = await testConnection(conn)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Test failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
