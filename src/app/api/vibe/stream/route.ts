/**
 * Vibe-Code Stream API (SSE)
 * GET /api/vibe/stream?session_id=&generation_id=
 *
 * Proxies the SSE stream from vibe_api CS_2 to the browser.
 * Falls back to a simulated stream when vibe_api is not running (stub mode).
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

  const encoder = new TextEncoder()

  // Helper: format SSE event
  function sseEvent(data: object): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
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
  } catch {
    // Fall through to stub stream
  }

  // Stub stream: simulate vibe_api output for UI development
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Status: parsing
        controller.enqueue(
          sseEvent({ type: 'status', content: 'Parsing feature request...' }),
        )
        await delay(200)

        // Status: migration agent
        controller.enqueue(
          sseEvent({
            type: 'status',
            content: 'Running migration agent...',
            layer: 'migration',
          }),
        )
        await delay(300)

        // Stream migration tokens
        const migrationTokens = [
          '-- Generating migration\n',
          'CREATE TABLE IF NOT EXISTS',
          ' np_feature (\n',
          '    id UUID PRIMARY KEY',
          ' DEFAULT gen_random_uuid(),\n',
          '    created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n',
          ');\n',
        ]
        for (const token of migrationTokens) {
          controller.enqueue(
            sseEvent({ type: 'token', content: token, layer: 'migration' }),
          )
          await delay(50)
        }

        controller.enqueue(
          sseEvent({
            type: 'status',
            content: 'Migration generated',
            layer: 'migration',
          }),
        )
        await delay(200)

        // Status: permissions agent
        controller.enqueue(
          sseEvent({
            type: 'status',
            content: 'Running permissions agent...',
            layer: 'permissions',
          }),
        )
        await delay(300)
        controller.enqueue(
          sseEvent({
            type: 'status',
            content: 'Permissions generated',
            layer: 'permissions',
          }),
        )
        await delay(200)

        // Status: UI agent
        controller.enqueue(
          sseEvent({
            type: 'status',
            content: 'Running UI agent...',
            layer: 'ui',
          }),
        )
        await delay(400)
        controller.enqueue(
          sseEvent({
            type: 'status',
            content: 'UI files generated',
            layer: 'ui',
          }),
        )
        await delay(100)

        // Done
        controller.enqueue(
          sseEvent({
            type: 'done',
            content: 'Generation complete. Click Apply to run.',
          }),
        )
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
