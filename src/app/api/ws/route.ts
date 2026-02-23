/**
 * WebSocket API Route
 * Handles WebSocket connections for real-time updates
 */

import { EventType } from '@/lib/websocket/events'
import { getWebSocketServer } from '@/lib/websocket/server'
import { Server as HTTPServer } from 'http'
import { NextRequest, NextResponse } from 'next/server'

// Store the HTTP server instance
let httpServer: HTTPServer | null = null

/**
 * Initialize WebSocket server
 * This is called once when the Next.js server starts
 */
function initializeWebSocketServer(req: NextRequest): void {
  // In Next.js, we need to access the underlying HTTP server
  // This is a bit tricky since Next.js abstracts it away
  // We'll use a singleton pattern to ensure it's only initialized once

  if (httpServer) {
    return // Already initialized
  }

  // Get the server from the request socket
  const socket = (req as unknown as { socket: { server: HTTPServer } }).socket
    ?.server

  if (!socket) {
    console.warn('Could not access HTTP server from request')
    return
  }

  httpServer = socket
  const wsServer = getWebSocketServer()
  wsServer.initialize(httpServer)

  // WebSocket server initialized
}

/**
 * GET endpoint - Health check
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Initialize WebSocket server if not already done
    initializeWebSocketServer(request)

    const wsServer = getWebSocketServer()
    const presence = wsServer.getPresence()

    return NextResponse.json({
      success: true,
      data: {
        connected: presence.length,
        presence: presence.map((p) => ({
          userId: p.userId,
          socketId: p.socketId,
          rooms: Array.from(p.rooms),
          connectedAt: p.connectedAt,
          lastSeen: p.lastSeen,
        })),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get WebSocket status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * POST endpoint - Emit event to connected clients
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { eventType, data, room } = body

    if (!eventType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event type is required',
        },
        { status: 400 },
      )
    }

    const wsServer = getWebSocketServer()

    // Emit event based on room or broadcast
    if (room) {
      wsServer.broadcastToRoom(room, eventType as EventType, data)
    } else {
      wsServer.broadcast(eventType as EventType, data)
    }

    return NextResponse.json({
      success: true,
      message: 'Event emitted',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to emit event',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
