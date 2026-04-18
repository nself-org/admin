import { NextResponse } from 'next/server'

interface ConnectBody {
  url: string
  apiKey: string
}

interface HealthResponse {
  version?: string
  [key: string]: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConnectBody
    const { url, apiKey } = body

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Backend URL is required.' },
        { status: 400 },
      )
    }

    const healthUrl = `${url.replace(/\/$/, '')}/health`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    let res: Response
    try {
      res = await fetch(healthUrl, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: `Backend returned HTTP ${res.status}. Check the URL and API key.`,
      })
    }

    let version = ''
    try {
      const data = (await res.json()) as HealthResponse
      if (typeof data.version === 'string') {
        version = data.version
      }
    } catch {
      // Health endpoint may not return JSON; that is acceptable
    }

    return NextResponse.json({ success: true, version })
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Connection timed out. Check that the backend is running and the URL is correct.'
        : error instanceof Error
          ? error.message
          : 'Unknown error'

    return NextResponse.json({ success: false, error: message })
  }
}
