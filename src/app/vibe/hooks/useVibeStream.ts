'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface StreamChunk {
  type: 'token' | 'status' | 'done' | 'error'
  content: string
  layer?: 'migration' | 'permissions' | 'ui'
}

interface UseVibeStreamReturn {
  chunks: StreamChunk[]
  isStreaming: boolean
  statusMessage: string
  startStream: (sessionId: string, generationId: string) => void
  clearStream: () => void
}

export function useVibeStream(): UseVibeStreamReturn {
  const [chunks, setChunks] = useState<StreamChunk[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearStream = useCallback(() => {
    setChunks([])
    setIsStreaming(false)
    setStatusMessage('')
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current)
      reconnectRef.current = null
    }
  }, [])

  const startStream = useCallback(
    (sessionId: string, generationId: string) => {
      clearStream()
      setIsStreaming(true)
      setChunks([])

      // Use SSE for streaming (simpler than WebSocket for Next.js)
      const evtSource = new EventSource(
        `/api/vibe/stream?session_id=${sessionId}&generation_id=${generationId}`,
      )

      evtSource.onmessage = (event: MessageEvent<string>) => {
        try {
          const chunk = JSON.parse(event.data) as StreamChunk
          setChunks((prev) => [...prev, chunk])

          if (chunk.type === 'status') {
            setStatusMessage(chunk.content)
          }

          if (chunk.type === 'done' || chunk.type === 'error') {
            setIsStreaming(false)
            evtSource.close()
          }
        } catch {
          // Ignore parse errors
        }
      }

      evtSource.onerror = () => {
        setIsStreaming(false)
        evtSource.close()
        setChunks((prev) => [
          ...prev,
          { type: 'error', content: 'Stream connection lost.' },
        ])
      }

      // Store cleanup ref
      wsRef.current = null
      reconnectRef.current = null

      // Return cleanup function via effect — store evtSource for cleanup
      const evtRef = evtSource
      reconnectRef.current = setTimeout(() => {
        // Noop: just for cleanup ref pattern
      }, 0)

      return () => {
        evtRef.close()
      }
    },
    [clearStream],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close()
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
    }
  }, [])

  return {
    chunks,
    isStreaming,
    statusMessage,
    startStream,
    clearStream,
  }
}
