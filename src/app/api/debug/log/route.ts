import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { message, data: _data } = await request.json()

    if (message && message.length > 1000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Debug log API error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
