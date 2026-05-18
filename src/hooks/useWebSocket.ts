/**
 * React Hook for WebSocket Connection
 * Provides WebSocket client access with React lifecycle management
 */

'use client'

import { getWebSocketClient } from '@/lib/websocket/client'
import { ConnectionStatus, EventType } from '@/lib/websocket/events'
import { useEffect, useRef, useState } from 'react'

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
  })

  const clientRef = useRef(getWebSocketClient())

  useEffect(() => {
    const client = clientRef.current

    // Subscribe to status changes
    const unsubscribe = client.onStatusChange((newStatus) => {
      setStatus(newStatus)
    })

    // Connect to WebSocket server
    client.connect()

    // Cleanup on unmount
    return () => {
      unsubscribe()
    }
  }, [])

  /**
   * Subscribe to event type
   */
  const on = <T = unknown>(eventType: EventType, listener: (data: T) => void) => {
    return clientRef.current.on(eventType, listener)
  }

  /**
   * Emit event to server
   */
  const emit = (eventType: EventType, data: unknown) => {
    clientRef.current.emit(eventType, data)
  }

  /**
   * Join a room
   */
  const joinRoom = (roomId: string) => {
    clientRef.current.joinRoom(roomId)
  }

  /**
   * Leave a room
   */
  const leaveRoom = (roomId: string) => {
    clientRef.current.leaveRoom(roomId)
  }

  return {
    status,
    connected: status.connected,
    reconnecting: status.reconnecting,
    on,
    emit,
    joinRoom,
    leaveRoom,
    client: clientRef.current,
  }
}
