// Server-Sent Events endpoint for real-time updates
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest): Promise<Response> {
  // Create a TransformStream for SSE
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Send initial connection message
  writer.write(
    encoder.encode('data: {"type":"connected","message":"SSE connected"}\n\n'),
  )

  // Set up periodic updates (example - in production, this would be event-driven)
  const interval = setInterval(async () => {
    try {
      // Example: Send container health updates
      const healthUpdate = {
        type: 'container-update',
        payload: {
          id: 'example-container',
          health: Math.random() > 0.5 ? 'healthy' : 'unhealthy',
          cpu: Math.random() * 100,
          memory: Math.random() * 8,
        },
      }

      await writer.write(
        encoder.encode(`data: ${JSON.stringify(healthUpdate)}\n\n`),
      )
    } catch {
      // Client disconnected
      clearInterval(interval)
      writer.close()
    }
  }, 5000)

  // Clean up on client disconnect
  request.signal.addEventListener('abort', () => {
    clearInterval(interval)
    writer.close()
  })

  // Return SSE response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
