/**
 * WebSocket Client Connection Manager
 * Handles client-side WebSocket connection with auto-reconnect
 */

import { io, Socket } from 'socket.io-client'
import {
  ConnectionStatus,
  EventType,
  HEARTBEAT_INTERVAL,
  RECONNECT_DELAYS,
  WebSocketMessage,
} from './events'

export class WebSocketClient {
  private socket: Socket | null = null
  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
  }
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private eventListeners: Map<EventType, Set<(data: unknown) => void>> = new Map()
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set()

  constructor(private url: string = '') {
    // URL will be set based on environment
    if (!this.url) {
      this.url =
        typeof window !== 'undefined'
          ? `${window.location.protocol}//${window.location.host}`
          : 'http://localhost:3021'
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      return
    }

    this.socket = io(this.url, {
      path: '/api/ws',
      transports: ['websocket', 'polling'],
      reconnection: false, // We handle reconnection manually
      timeout: 10000,
    })

    this.setupEventHandlers()
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.updateConnectionStatus({
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
    })
  }

  /**
   * Setup event handlers for socket connection
   */
  private setupEventHandlers(): void {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      this.updateConnectionStatus({
        connected: true,
        reconnecting: false,
        lastConnected: new Date().toISOString(),
        reconnectAttempts: 0,
      })

      this.startHeartbeat()
    })

    this.socket.on('disconnect', (reason: string) => {
      this.updateConnectionStatus({
        connected: false,
        reconnecting: false,
        reconnectAttempts: this.connectionStatus.reconnectAttempts,
      })

      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer)
        this.heartbeatTimer = null
      }

      // Auto-reconnect unless manually disconnected
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect()
      }
    })

    // Error handling
    this.socket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error)
      this.scheduleReconnect()
    })

    // Heartbeat response
    this.socket.on(EventType.PONG, () => {
      // Server is alive, reset reconnect attempts
      this.connectionStatus.reconnectAttempts = 0
    })

    // Generic message handler
    this.socket.onAny((eventType: string, message: WebSocketMessage) => {
      const listeners = this.eventListeners.get(eventType as EventType)
      if (listeners) {
        listeners.forEach((listener) => {
          try {
            listener(message.data)
          } catch (error) {
            console.error(`Error in event listener for ${eventType}:`, error)
          }
        })
      }
    })
  }

  /**
   * Start heartbeat ping/pong
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit(EventType.HEARTBEAT)
      }
    }, HEARTBEAT_INTERVAL)
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return // Already scheduled
    }

    this.updateConnectionStatus({
      ...this.connectionStatus,
      reconnecting: true,
      reconnectAttempts: this.connectionStatus.reconnectAttempts + 1,
    })

    const attemptIndex = Math.min(
      this.connectionStatus.reconnectAttempts - 1,
      RECONNECT_DELAYS.length - 1
    )
    const delay = RECONNECT_DELAYS[attemptIndex]

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  /**
   * Subscribe to event type
   */
  on<T = unknown>(eventType: EventType, listener: (data: T) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }

    this.eventListeners.get(eventType)!.add(listener as (data: unknown) => void)

    // Return unsubscribe function
    return () => {
      this.off(eventType, listener)
    }
  }

  /**
   * Unsubscribe from event type
   */
  off<T = unknown>(eventType: EventType, listener: (data: T) => void): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(listener as (data: unknown) => void)
    }
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener)

    // Immediately call with current status
    listener(this.connectionStatus)

    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  /**
   * Emit event to server
   */
  emit(eventType: EventType, data: unknown): void {
    if (!this.socket?.connected) {
      console.warn(`Cannot emit ${eventType}: not connected`)
      return
    }

    const message: WebSocketMessage = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    }

    this.socket.emit(eventType, message)
  }

  /**
   * Join a room
   */
  joinRoom(roomId: string): void {
    this.emit(EventType.JOIN_ROOM, { roomId })
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string): void {
    this.emit(EventType.LEAVE_ROOM, { roomId })
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.connectionStatus }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionStatus.connected
  }

  /**
   * Update connection status and notify listeners
   */
  private updateConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status

    this.statusListeners.forEach((listener) => {
      try {
        listener(status)
      } catch (error) {
        console.error('Error in status listener:', error)
      }
    })
  }
}

// Global singleton instance
let globalClient: WebSocketClient | null = null

/**
 * Get global WebSocket client instance
 */
export function getWebSocketClient(): WebSocketClient {
  if (typeof window === 'undefined') {
    throw new Error('WebSocketClient can only be used in browser environment')
  }

  if (!globalClient) {
    globalClient = new WebSocketClient()
  }

  return globalClient
}
