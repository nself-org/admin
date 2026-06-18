/**
 * SSE Stream Hook
 * Manages SSE connection with automatic reconnection and Zustand updates
 */

import { useCentralDataStore } from '@/stores/centralDataStore'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface SSEState {
  connected: boolean
  reconnecting: boolean
  error: string | null
  lastUpdate: number
}

export function useSSEStream() {
  const [state, setState] = useState<SSEState>({
    connected: false,
    reconnecting: false,
    error: null,
    lastUpdate: 0,
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 10
  const baseReconnectDelay = 1000 // Start with 1 second

  // Get store update functions
  const updateStore = useCentralDataStore((state) => state.updateFromSSE)

  /**
   * Connect to SSE stream
   */
  const connect = useCallback(() => {
    // Clean up existing connection
    disconnect()

    setState((prev) => ({ ...prev, reconnecting: true, error: null }))

    try {
      const eventSource = new EventSource('/api/sse/stream')
      eventSourceRef.current = eventSource

      // Handle connection open
      eventSource.onopen = () => {
        setState({
          connected: true,
          reconnecting: false,
          error: null,
          lastUpdate: Date.now(),
        })
        reconnectAttemptsRef.current = 0
      }

      // Handle messages
      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        } catch {
          // Intentionally empty - skip malformed SSE messages
        }
      }

      // Handle errors
      eventSource.onerror = (_error) => {
        // Check if this is a connection failure
        if (eventSource.readyState === EventSource.CLOSED) {
          setState((prev) => ({
            ...prev,
            connected: false,
            reconnecting: true,
            error: 'Connection lost',
          }))

          // Clean up current connection
          eventSource.close()
          eventSourceRef.current = null

          // Attempt reconnection with exponential backoff
          scheduleReconnect()
        }
      }
    } catch (_error) {
      setState((prev) => ({
        ...prev,
        connected: false,
        reconnecting: false,
        error: 'Failed to connect',
      }))
      scheduleReconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handleMessage and scheduleReconnect are stable functions in same component scope; circular dependency prevents wrapping in useCallback
  }, [])

  /**
   * Disconnect from SSE stream
   */
  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setState({
      connected: false,
      reconnecting: false,
      error: null,
      lastUpdate: 0,
    })
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  const scheduleReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setState((prev) => ({
        ...prev,
        reconnecting: false,
        error: 'Max reconnection attempts reached. Please refresh the page.',
      }))
      return
    }

    // Calculate delay with exponential backoff (max 30 seconds)
    const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current), 30000)

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++
      connect()
    }, delay)
  }

  /**
   * Handle incoming SSE message
   */
  const handleMessage = (message: any) => {
    const { type, data } = message

    switch (type) {
      case 'initial':
      case 'state':
        // Update entire state
        updateStore(data)
        setState((prev) => ({ ...prev, lastUpdate: Date.now() }))
        break

      case 'dockerEvent':
        // Handle Docker events if needed
        break

      case 'serviceUpdate':
        // Handle service-specific updates
        break

      case 'ping':
        // Keep-alive ping
        console.debug('[SSE Client] Ping received')
        break

      default:
        console.warn('[SSE Client] Unknown message type:', type)
    }
  }

  /**
   * Manual refresh
   */
  const refresh = async () => {
    try {
      const response = await fetch('/api/sse/stream', { method: 'POST' })
      const _result = await response.json()
    } catch (_error) {
      // Intentionally empty - refresh failures are handled silently
    }
  }

  // Setup connection on mount
  useEffect(() => {
    connect()

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Intentionally empty - page is hidden
      } else {
        // If not connected and not already reconnecting, try to reconnect
        if (!eventSourceRef.current && !reconnectTimeoutRef.current) {
          reconnectAttemptsRef.current = 0 // Reset attempts on page return
          connect()
        }
      }
    }

    // Handle online/offline
    const handleOnline = () => {
      reconnectAttemptsRef.current = 0
      connect()
    }

    const handleOffline = () => {
      disconnect()
      setState((prev) => ({
        ...prev,
        error: 'Network offline',
      }))
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup on unmount
    return () => {
      disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [connect]) // Include connect function

  return {
    ...state,
    refresh,
    reconnect: () => {
      reconnectAttemptsRef.current = 0
      connect()
    },
  }
}
