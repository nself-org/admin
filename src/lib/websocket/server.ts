/**
 * WebSocket Server Setup
 * Socket.io server with room-based architecture and event batching
 */

import { Server as HTTPServer } from 'http'
import { Socket, Server as SocketIOServer } from 'socket.io'
import {
  DEFAULT_BATCH_CONFIG,
  EventBatchConfig,
  EventType,
  HEARTBEAT_INTERVAL,
  HEARTBEAT_TIMEOUT,
  WebSocketMessage,
} from './events'

interface PresenceInfo {
  userId: string
  socketId: string
  rooms: Set<string>
  connectedAt: string
  lastSeen: string
}

interface EventBatch {
  events: WebSocketMessage[]
  timer: NodeJS.Timeout | null
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Security constants
const MAX_MESSAGE_SIZE = 64 * 1024 // 64 KB max payload
const RATE_LIMIT_WINDOW_MS = 1000 // 1 second window
const RATE_LIMIT_MAX_MESSAGES = 30 // max messages per window per connection

export class WebSocketServer {
  private io: SocketIOServer | null = null
  private presence: Map<string, PresenceInfo> = new Map()
  private eventBatches: Map<string, EventBatch> = new Map()
  private batchConfig: EventBatchConfig = DEFAULT_BATCH_CONFIG
  private rateLimits: Map<string, RateLimitEntry> = new Map()

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      path: '/api/ws',
      cors: {
        // nAdmin runs at localhost:3021 only. CORS is low-risk since
        // the service is never exposed to the internet. Kept permissive
        // intentionally for Docker/port-forwarding flexibility.
        origin: '*',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
      pingInterval: HEARTBEAT_INTERVAL,
      pingTimeout: HEARTBEAT_TIMEOUT,
      maxHttpBufferSize: MAX_MESSAGE_SIZE,
    })

    this.setupEventHandlers()
    this.startPresenceCleanup()

    return this.io
  }

  /**
   * Setup connection and event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return

    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`)

      // Track presence (async, but we don't need to wait)
      void this.trackPresence(socket)

      // Rate-limit middleware: wraps all incoming events
      socket.use((packet, next) => {
        if (this.isRateLimited(socket.id)) {
          console.warn(`Rate limited: ${socket.id}`)
          next(new Error('Rate limit exceeded'))
          return
        }
        this.recordMessage(socket.id)

        // Input validation: reject non-array packets or oversized serialized data
        const serialized = JSON.stringify(packet)
        if (serialized.length > MAX_MESSAGE_SIZE) {
          console.warn(`Oversized payload rejected from ${socket.id}: ${serialized.length} bytes`)
          next(new Error('Payload too large'))
          return
        }

        next()
      })

      // Heartbeat handler
      socket.on(EventType.HEARTBEAT, () => {
        this.updateLastSeen(socket.id)
        socket.emit(EventType.PONG)
      })

      // Room management
      socket.on(
        EventType.JOIN_ROOM,
        (message: WebSocketMessage<{ roomId: string }>) => {
          if (!this.isValidRoomId(message?.data?.roomId)) {
            socket.emit(EventType.ERROR, { error: 'Invalid room ID' })
            return
          }
          this.handleJoinRoom(socket, message.data.roomId)
        },
      )

      socket.on(
        EventType.LEAVE_ROOM,
        (message: WebSocketMessage<{ roomId: string }>) => {
          if (!this.isValidRoomId(message?.data?.roomId)) {
            socket.emit(EventType.ERROR, { error: 'Invalid room ID' })
            return
          }
          this.handleLeaveRoom(socket, message.data.roomId)
        },
      )

      // Disconnection
      socket.on('disconnect', (reason: string) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`)
        this.removePresence(socket.id)
        this.rateLimits.delete(socket.id)
      })

      // Error handling
      socket.on('error', (error: Error) => {
        console.error(`Socket error (${socket.id}):`, error)
      })
    })
  }

  /**
   * Track client presence
   */
  private async trackPresence(socket: Socket): Promise<void> {
    const userId = await this.getUserIdFromSocket(socket)
    const now = new Date().toISOString()

    const presenceInfo: PresenceInfo = {
      userId,
      socketId: socket.id,
      rooms: new Set(),
      connectedAt: now,
      lastSeen: now,
    }

    this.presence.set(socket.id, presenceInfo)
  }

  /**
   * Update last seen timestamp
   */
  private updateLastSeen(socketId: string): void {
    const presenceInfo = this.presence.get(socketId)
    if (presenceInfo) {
      presenceInfo.lastSeen = new Date().toISOString()
    }
  }

  /**
   * Remove presence on disconnect
   */
  private removePresence(socketId: string): void {
    this.presence.delete(socketId)
  }

  /**
   * Handle join room request
   */
  private handleJoinRoom(socket: Socket, roomId: string): void {
    socket.join(roomId)

    const presenceInfo = this.presence.get(socket.id)
    if (presenceInfo) {
      presenceInfo.rooms.add(roomId)
    }

    console.log(`Socket ${socket.id} joined room: ${roomId}`)

    // Notify room members
    this.broadcastToRoom(roomId, EventType.CONNECT, {
      socketId: socket.id,
      userId: presenceInfo?.userId,
      room: roomId,
    })
  }

  /**
   * Handle leave room request
   */
  private handleLeaveRoom(socket: Socket, roomId: string): void {
    socket.leave(roomId)

    const presenceInfo = this.presence.get(socket.id)
    if (presenceInfo) {
      presenceInfo.rooms.delete(roomId)
    }

    console.log(`Socket ${socket.id} left room: ${roomId}`)

    // Notify room members
    this.broadcastToRoom(roomId, EventType.DISCONNECT, {
      socketId: socket.id,
      userId: presenceInfo?.userId,
      room: roomId,
    })
  }

  /**
   * Broadcast event to all clients in a room
   */
  broadcastToRoom<T = unknown>(
    roomId: string,
    eventType: EventType,
    data: T,
  ): void {
    if (!this.io) return

    const message: WebSocketMessage<T> = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      room: roomId,
    }

    this.io.to(roomId).emit(eventType, message)
  }

  /**
   * Emit event to specific socket
   */
  emitToSocket<T = unknown>(
    socketId: string,
    eventType: EventType,
    data: T,
  ): void {
    if (!this.io) return

    const message: WebSocketMessage<T> = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    }

    this.io.to(socketId).emit(eventType, message)
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast<T = unknown>(eventType: EventType, data: T): void {
    if (!this.io) return

    const message: WebSocketMessage<T> = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    }

    this.io.emit(eventType, message)
  }

  /**
   * Batch events for efficiency
   */
  batchEvent<T = unknown>(roomId: string, eventType: EventType, data: T): void {
    const batchKey = `${roomId}:${eventType}`

    if (!this.eventBatches.has(batchKey)) {
      this.eventBatches.set(batchKey, {
        events: [],
        timer: null,
      })
    }

    const batch = this.eventBatches.get(batchKey)!

    const message: WebSocketMessage<T> = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      room: roomId,
    }

    batch.events.push(message)

    // Send batch if size limit reached
    if (batch.events.length >= this.batchConfig.maxSize) {
      this.flushBatch(batchKey)
      return
    }

    // Schedule batch send if not already scheduled
    if (!batch.timer) {
      batch.timer = setTimeout(() => {
        this.flushBatch(batchKey)
      }, this.batchConfig.maxWait)
    }
  }

  /**
   * Flush event batch
   */
  private flushBatch(batchKey: string): void {
    const batch = this.eventBatches.get(batchKey)
    if (!batch || batch.events.length === 0) return

    if (batch.timer) {
      clearTimeout(batch.timer)
    }

    // Send all batched events
    batch.events.forEach((message) => {
      if (message.room && this.io) {
        this.io.to(message.room).emit(message.type, message)
      }
    })

    // Clear batch
    this.eventBatches.delete(batchKey)
  }

  /**
   * Get presence information
   */
  getPresence(): PresenceInfo[] {
    return Array.from(this.presence.values())
  }

  /**
   * Get presence for specific user
   */
  getUserPresence(userId: string): PresenceInfo[] {
    return Array.from(this.presence.values()).filter((p) => p.userId === userId)
  }

  /**
   * Get room members
   */
  getRoomMembers(roomId: string): PresenceInfo[] {
    return Array.from(this.presence.values()).filter((p) => p.rooms.has(roomId))
  }

  /**
   * Cleanup stale presence entries
   */
  private startPresenceCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      const staleThreshold = 5 * 60 * 1000 // 5 minutes

      Array.from(this.presence.entries()).forEach(
        ([socketId, presenceInfo]) => {
          const lastSeen = new Date(presenceInfo.lastSeen).getTime()
          if (now - lastSeen > staleThreshold) {
            console.log(`Removing stale presence: ${socketId}`)
            this.presence.delete(socketId)
          }
        },
      )
    }, 60000) // Check every minute
  }

  /**
   * Extract user ID from socket
   * Validates session token from cookie or auth header
   */
  private async getUserIdFromSocket(socket: Socket): Promise<string> {
    // SECURITY: Never trust client-provided userId without validation
    // Only validate session token from cookie

    // Extract session token from cookie
    const cookies = socket.handshake.headers.cookie
    if (cookies) {
      const sessionMatch = cookies.match(/session=([^;]+)/)
      if (sessionMatch) {
        const sessionToken = sessionMatch[1]

        // Validate session token against database
        try {
          const { auth } = await import('../auth-db')
          const session = await auth.validateSession(sessionToken)

          if (session && session.userId) {
            return session.userId
          }
        } catch (error) {
          console.error('WebSocket session validation error:', error)
        }
      }
    }

    // Default to 'admin' for single-user mode (when no valid session)
    // This is intentional for the single-user architecture
    return 'admin'
  }

  /**
   * Check if a socket has exceeded the rate limit
   */
  private isRateLimited(socketId: string): boolean {
    const entry = this.rateLimits.get(socketId)
    if (!entry) return false

    const now = Date.now()
    if (now > entry.resetAt) {
      // Window expired, reset
      this.rateLimits.delete(socketId)
      return false
    }

    return entry.count >= RATE_LIMIT_MAX_MESSAGES
  }

  /**
   * Record an incoming message for rate limiting
   */
  private recordMessage(socketId: string): void {
    const now = Date.now()
    const entry = this.rateLimits.get(socketId)

    if (!entry || now > entry.resetAt) {
      this.rateLimits.set(socketId, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW_MS,
      })
    } else {
      entry.count++
    }
  }

  /**
   * Validate room ID: must be a non-empty string of reasonable length
   * containing only alphanumeric characters, hyphens, and underscores.
   */
  private isValidRoomId(roomId: unknown): roomId is string {
    if (typeof roomId !== 'string') return false
    if (roomId.length === 0 || roomId.length > 128) return false
    return /^[a-zA-Z0-9_-]+$/.test(roomId)
  }

  /**
   * Get Socket.IO server instance
   */
  getIO(): SocketIOServer | null {
    return this.io
  }

  /**
   * Shutdown server
   */
  shutdown(): void {
    // Flush all pending batches
    Array.from(this.eventBatches.keys()).forEach((batchKey) => {
      this.flushBatch(batchKey)
    })

    if (this.io) {
      this.io.close()
      this.io = null
    }

    this.presence.clear()
    this.eventBatches.clear()
    this.rateLimits.clear()
  }
}

// Global singleton instance
let globalServer: WebSocketServer | null = null

/**
 * Get global WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer {
  if (!globalServer) {
    globalServer = new WebSocketServer()
  }

  return globalServer
}
