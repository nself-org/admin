import { loadConnections, testConnection } from '@/features/remote/remote'
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
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
