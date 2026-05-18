/**
 * React Hook for Build Progress Updates
 * Real-time build progress via WebSocket
 */

'use client'

import { BuildProgressEvent, EventType } from '@/lib/websocket/events'
import { useEffect, useState } from 'react'
import { useWebSocket } from './useWebSocket'

export function useBuildProgress() {
  const [progress, setProgress] = useState<BuildProgressEvent | null>(null)
  const [history, setHistory] = useState<BuildProgressEvent[]>([])
  const { on, connected } = useWebSocket()

  useEffect(() => {
    if (!connected) return

    // Subscribe to build progress updates
    const unsubscribe = on<BuildProgressEvent>(EventType.BUILD_PROGRESS, (data) => {
      setProgress(data)
      setHistory((prev) => [...prev, data])
    })

    return () => {
      unsubscribe()
    }
  }, [connected, on])

  // Reset progress and history
  const reset = () => {
    setProgress(null)
    setHistory([])
  }

  return {
    progress,
    history,
    reset,
    isBuilding: progress?.status === 'in-progress',
    isComplete: progress?.status === 'complete',
    isFailed: progress?.status === 'failed',
  }
}
