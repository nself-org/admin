'use client'

import { DataPoint } from '@/components/dashboard/ResourceSparkline'
import { ServiceCardData } from '@/components/dashboard/ServiceCard'
import { getWebSocketClient } from '@/lib/websocket/client'
import {
  DockerStatsEvent,
  EventType,
  isDockerStatsEvent,
  isServiceStatusEvent,
  ServiceStatusEvent,
} from '@/lib/websocket/events'
import { useEffect, useState } from 'react'

export interface DashboardData {
  services: ServiceCardData[]
  cpuHistory: DataPoint[]
  memoryHistory: DataPoint[]
  networkHistory: DataPoint[]
  lastUpdate: number
}

const MAX_HISTORY_POINTS = 60 // 1 hour at 1 minute intervals

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    services: [],
    cpuHistory: [],
    memoryHistory: [],
    networkHistory: [],
    lastUpdate: Date.now(),
  })
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let wsClient: ReturnType<typeof getWebSocketClient> | null = null

    try {
      // Initialize WebSocket client
      wsClient = getWebSocketClient()

      // Subscribe to connection status
      const unsubscribeStatus = wsClient.onStatusChange((status) => {
        setIsConnected(status.connected)
        if (!status.connected && status.reconnecting) {
          setError('Reconnecting to server...')
        } else if (status.connected) {
          setError(null)
        }
      })

      // Subscribe to service status updates
      const unsubscribeService = wsClient.on<ServiceStatusEvent>(
        EventType.SERVICE_STATUS,
        (event) => {
          if (!isServiceStatusEvent(event)) return

          setData((prev) => {
            const services = [...prev.services]
            const index = services.findIndex((s) => s.name === event.service)

            const updatedService: ServiceCardData = {
              name: event.service,
              displayName: event.service
                .split('_')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' '),
              status: event.status,
              health: event.health?.status,
              cpu: event.resources?.cpu,
              memory: event.resources?.memory,
              containerId: event.containerId,
            }

            if (index >= 0) {
              services[index] = updatedService
            } else {
              services.push(updatedService)
            }

            return {
              ...prev,
              services,
              lastUpdate: Date.now(),
            }
          })
        }
      )

      // Subscribe to Docker stats updates
      const unsubscribeStats = wsClient.on<DockerStatsEvent>(EventType.DOCKER_STATS, (event) => {
        if (!isDockerStatsEvent(event)) return

        const timestamp = Date.now()

        setData((prev) => {
          // Update CPU history
          const cpuHistory = [...prev.cpuHistory, { timestamp, value: event.stats.cpu }].slice(
            -MAX_HISTORY_POINTS
          )

          // Update memory history
          const memoryHistory = [
            ...prev.memoryHistory,
            { timestamp, value: event.stats.memoryPercent },
          ].slice(-MAX_HISTORY_POINTS)

          // Update network history (combined rx + tx in Mbps)
          const networkMbps = ((event.stats.network.rx + event.stats.network.tx) * 8) / 1000000
          const networkHistory = [...prev.networkHistory, { timestamp, value: networkMbps }].slice(
            -MAX_HISTORY_POINTS
          )

          // Update service with latest stats
          const services = prev.services.map((service) => {
            if (service.containerId === event.containerId) {
              return {
                ...service,
                cpu: event.stats.cpu,
                memory: event.stats.memoryPercent,
              }
            }
            return service
          })

          return {
            ...prev,
            services,
            cpuHistory,
            memoryHistory,
            networkHistory,
            lastUpdate: timestamp,
          }
        })
      })

      // Connect to WebSocket
      wsClient.connect()

      // Cleanup
      return () => {
        unsubscribeStatus()
        unsubscribeService()
        unsubscribeStats()
        wsClient?.disconnect()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to WebSocket')
      console.error('WebSocket error:', err)
    }
  }, [])

  return {
    ...data,
    isConnected,
    error,
  }
}
