/**
 * Vibe-Code Stream API (SSE)
 * GET /api/vibe/stream?session_id=&generation_id=
 *
 * Proxies the SSE stream from vibe_api CS_2 to the browser.
 * When vibe_api is not running, returns 503 with X-Service-Required: vibe_api.
 *
 * Performance target: first token within 500ms of prompt submit.
 */

import { NextRequest } from 'next/server'

const VIBE_API_PORT = process.env.NSELF_VIBE_PORT ?? '8003'
const VIBE_API_BASE = `http://127.0.0.1:${VIBE_API_PORT}`

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  const generationId = searchParams.get('generation_id')

  if (!sessionId || !generationId) {
    return new Response('Missing session_id or generation_id', { status: 400 })
  }

  // Try to proxy from vibe_api
  try {
    const upstreamRes = await fetch(
      `${VIBE_API_BASE}/stream?session_id=${sessionId}&generation_id=${generationId}`,
      { signal: AbortSignal.timeout(2000) }, // 2s connection timeout
    )

    if (upstreamRes.ok && upstreamRes.body) {
      // Proxy the SSE stream
      const stream = new ReadableStream({
        async start(controller) {
          const reader = upstreamRes.body!.getReader()
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              controller.enqueue(value)
            }
          } finally {
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    // vibe_api responded but with a non-OK status
    return new Response(
      JSON.stringify({
        error: 'Vibe AI service is offline. Start the vibe_api custom service (CS_2) to use Vibe-Code.',
        service: 'vibe_api',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Required': 'vibe_api',
        },
      },
    )
  } catch {
    // vibe_api not reachable (ECONNREFUSED, timeout, etc.)
    return new Response(
      JSON.stringify({
        error: 'Vibe AI service is offline. Start the vibe_api custom service (CS_2) to use Vibe-Code.',
        service: 'vibe_api',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Required': 'vibe_api',
        },
      },
    )
  }
}
