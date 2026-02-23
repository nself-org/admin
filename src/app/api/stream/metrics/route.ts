import { NextRequest, NextResponse } from 'next/server'

// SSE endpoint for streaming metrics updates
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  })

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Send initial connection message
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`,
        ),
      )

      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: heartbeat\ndata: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`,
            ),
          )
        } catch {
          // Connection closed
          clearInterval(heartbeatInterval)
        }
      }, 30000) // Every 30 seconds

      // Data update interval (sends delta updates)
      const dataInterval = setInterval(async () => {
        try {
          // Fetch latest metrics
          const [dockerRes, systemRes, containersRes] =
            await Promise.allSettled([
              fetch('http://localhost:3001/api/docker/stats'),
              fetch('http://localhost:3001/api/system/metrics'),
              fetch('http://localhost:3001/api/docker/containers'),
            ])

          const updates: any = {}

          if (dockerRes.status === 'fulfilled' && dockerRes.value.ok) {
            const dockerData = await dockerRes.value.json()
            if (dockerData.success) {
              updates.docker = dockerData.data
            }
          }

          if (systemRes.status === 'fulfilled' && systemRes.value.ok) {
            const systemData = await systemRes.value.json()
            if (systemData.success && systemData.data) {
              updates.system = systemData.data.system
              if (systemData.data.docker) {
                updates.docker = systemData.data.docker
              }
            }
          }

          if (containersRes.status === 'fulfilled' && containersRes.value.ok) {
            const containersData = await containersRes.value.json()
            if (containersData.success) {
              updates.containers = containersData.data
            }
          }

          // Send updates if we have any
          if (Object.keys(updates).length > 0) {
            controller.enqueue(
              encoder.encode(
                `event: update\ndata: ${JSON.stringify({ type: 'update', data: updates, timestamp: new Date().toISOString() })}\n\n`,
              ),
            )
          }
        } catch {
          // Silent fail on stream updates - will retry on next interval
        }
      }, 2000) // Every 2 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        clearInterval(dataInterval)
        controller.close()
      })
    },
  })

  return new NextResponse(stream, { headers })
}
