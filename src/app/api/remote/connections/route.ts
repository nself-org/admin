import { addConnection, loadConnections } from '@/features/remote/remote'
import type { RemoteConnection, RemoteError } from '@/features/remote/types'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const store = await loadConnections()
    return NextResponse.json({ connections: store.connections })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Omit<RemoteConnection, 'id'>
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }
    if (typeof body.host !== 'string' || body.host.trim().length === 0) {
      return NextResponse.json({ error: 'Host is required.' }, { status: 400 })
    }
    if (body.mode !== 'ssh' && body.mode !== 'api') {
      return NextResponse.json(
        { error: 'Mode must be ssh or api.' },
        { status: 400 },
      )
    }
    const saved = await addConnection(body)
    return NextResponse.json({ connection: saved })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add.'
    const code = (err as RemoteError).code
    const status = code === 'IO_ERROR' ? 500 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
