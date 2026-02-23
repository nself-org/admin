import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { message, data } = await request.json()

    if (message && message.length > 1000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }

    console.log(
      `[CLIENT DEBUG] ${message}`,
      data ? JSON.stringify(data, null, 2) : '',
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Debug log API error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
