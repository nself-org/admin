/**
 * React Hook for Service Status Updates
 * Real-time service status via WebSocket
 */

'use client'

import { EventType, ServiceStatusEvent } from '@/lib/websocket/events'
import { useEffect, useState } from 'react'
import { useWebSocket } from './useWebSocket'

export interface ServiceStatus {
  [serviceName: string]: ServiceStatusEvent
}

export function useServiceStatus(serviceName?: string) {
  const [statuses, setStatuses] = useState<ServiceStatus>({})
  const { on, connected } = useWebSocket()

  useEffect(() => {
    if (!connected) return

    // Subscribe to service status updates
    const unsubscribe = on<ServiceStatusEvent>(EventType.SERVICE_STATUS, (data) => {
      // Only update if this is the service we're watching, or if no specific service is set
      if (!serviceName || data.service === serviceName) {
        setStatuses((prev) => ({
          ...prev,
          [data.service]: data,
        }))
      }
    })

    return () => {
      unsubscribe()
    }
  }, [connected, on, serviceName])

  // Get status for specific service
  const getStatus = (name: string): ServiceStatusEvent | undefined => {
    return statuses[name]
  }

  // Get status for the watched service
  const status = serviceName ? statuses[serviceName] : undefined

  return {
    statuses,
    status,
    getStatus,
  }
}
