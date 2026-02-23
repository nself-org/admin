/**
 * SSE Stream API Endpoint
 * Provides real-time data streaming via Server-Sent Events
 */

import { getSSEManager } from '@/services/SSEManager'
import { NextRequest } from 'next/server'

// Initialize SSE manager on module load
const sseManager = getSSEManager()
let initPromise: Promise<void> | null = null

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = sseManager.initialize()
  }
  await initPromise
}

export async function GET(_request: NextRequest): Promise<Response> {
  // Ensure SSE manager is initialized
  await ensureInitialized()

  // Generate unique client ID
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(7)}`

  // Create SSE stream
  const stream = sseManager.createStream(clientId)

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  })
}

// Handle POST for manual refresh
export async function POST(): Promise<Response> {
  await ensureInitialized()
  await sseManager.refresh()

  return Response.json({
    success: true,
    message: 'Data refreshed',
    clients: sseManager.getClientCount(),
  })
}
