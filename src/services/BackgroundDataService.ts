// Background Data Service - Manages all async data fetching
// This service runs continuously in the background, feeding data to the store
// Pages never call APIs directly - they only subscribe to store changes

import { useProjectStore } from '@/stores/projectStore'

type IntervalConfig = {
  enabled: boolean
  interval: number
  lastFetch: number
  fetcher: () => Promise<void>
}

class BackgroundDataService {
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private configs: Map<string, IntervalConfig> = new Map()
  private isRunning = false
  private eventSource: EventSource | null = null

  constructor() {
    // Define data sources with their intervals
    this.configs.set('containers', {
      enabled: true,
      interval: 2000, // 2 seconds for quick status updates
      lastFetch: 0,
      fetcher: this.fetchContainers,
    })

    this.configs.set('containerStats', {
      enabled: true,
      interval: 10000, // 10 seconds for detailed stats (CPU/Memory)
      lastFetch: 0,
      fetcher: this.fetchContainerStats,
    })

    this.configs.set('database', {
      enabled: true,
      interval: 5000, // 5 seconds for database stats
      lastFetch: 0,
      fetcher: this.fetchDatabase,
    })

    this.configs.set('systemMetrics', {
      enabled: true,
      interval: 3000, // 3 seconds for system metrics
      lastFetch: 0,
      fetcher: this.fetchSystemMetrics,
    })

    this.configs.set('projectStatus', {
      enabled: true,
      interval: 30000, // 30 seconds for project status (rarely changes)
      lastFetch: 0,
      fetcher: this.fetchProjectStatus,
    })
  }

  // Start all background fetching
  start() {
    if (this.isRunning) return
    this.isRunning = true

    // Start SSE connection for real-time updates if available
    this.connectSSE()

    // Start each data source with its own interval
    this.configs.forEach((config, key) => {
      if (config.enabled) {
        // Initial fetch
        config.fetcher().catch(() => {})

        // Set up interval
        const intervalId = setInterval(async () => {
          try {
            await config.fetcher()
            config.lastFetch = Date.now()
          } catch (err) {
            console.warn(`[BackgroundDataService] Error fetching ${key}:`, err)
          }
        }, config.interval)

        this.intervals.set(key, intervalId)
      }
    })
  }

  // Stop all background fetching
  stop() {
    if (!this.isRunning) return
    this.isRunning = false

    // Clear all intervals
    this.intervals.forEach((interval) => clearInterval(interval))
    this.intervals.clear()

    // Close SSE connection
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  // Connect to SSE endpoint for real-time updates
  private connectSSE() {
    try {
      // Try to connect to SSE endpoint if available
      this.eventSource = new EventSource('/api/sse/updates')

      this.eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        this.handleRealtimeUpdate(data)
      }

      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close()
          this.eventSource = null
        }
      }
    } catch (err) {
      console.warn('[BackgroundDataService] Error connecting to SSE:', err)
    }
  }

  // Handle real-time updates from SSE
  private handleRealtimeUpdate(data: any) {
    const store = useProjectStore.getState()

    switch (data.type) {
      case 'container-update': {
        // Update specific container in store
        const containers = [...store.containerStats]
        const index = containers.findIndex((c) => c.id === data.payload.id)
        if (index >= 0) {
          containers[index] = { ...containers[index], ...data.payload }
          store.updateCachedData({ containerStats: containers })
        }
        break
      }

      case 'metrics-update':
        store.updateCachedData({ systemMetrics: data.payload })
        break

      case 'database-update':
        store.updateCachedData({
          databaseStats: data.payload.stats,
          databaseTables: data.payload.tables,
        })
        break
    }
  }

  // Fetch container status - fast, no stats
  private async fetchContainers() {
    const store = useProjectStore.getState()
    if (store.projectStatus !== 'running') return

    try {
      // Quick fetch without stats for responsive updates
      const response = await fetch('/api/docker/containers?detailed=true&stats=false', {
        credentials: 'same-origin',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          // Only update if we got valid container data
          // Don't replace existing data with empty array when services are running
          const containers = data.data
          if (containers.length > 0 || store.projectStatus !== 'running') {
            // Group containers by category for efficient updates
            const byCategory: Record<string, any[]> = {}
            containers.forEach((container: any) => {
              const category = container.category || 'services'
              if (!byCategory[category]) {
                byCategory[category] = []
              }
              byCategory[category].push(container)
            })

            store.updateCachedData({
              containerStats: containers,
            })
          }
        }
      }
    } catch (_err) {
      // Silent fail - will retry on next interval
    }
  }

  // Fetch container stats with CPU/Memory - slower but detailed
  private async fetchContainerStats() {
    const store = useProjectStore.getState()
    if (store.projectStatus !== 'running') return

    try {
      // Fetch with stats for CPU/Memory data
      const response = await fetch('/api/docker/containers?detailed=true&stats=true', {
        credentials: 'same-origin',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.data)) {
          // Merge stats into existing container data
          const currentContainers = store.containerStats || []
          const newContainers = data.data

          // If we have current containers, merge stats; otherwise use new data
          if (currentContainers.length > 0) {
            const updatedContainers = currentContainers.map((container) => {
              const statsContainer = newContainers.find((c: any) => c.id === container.id)
              if (statsContainer) {
                return { ...container, ...statsContainer }
              }
              return container
            })

            store.updateCachedData({
              containerStats: updatedContainers,
            })
          } else if (newContainers.length > 0) {
            // No current data, use the new data
            store.updateCachedData({
              containerStats: newContainers,
            })
          }
        }
      }
    } catch (_err) {
      // Silent fail - will retry on next interval
    }
  }

  // Fetch database stats
  private async fetchDatabase() {
    const store = useProjectStore.getState()
    if (store.projectStatus !== 'running') return

    try {
      // Fetch both in parallel
      const [statsRes, tablesRes] = await Promise.all([
        fetch('/api/database?action=stats'),
        fetch('/api/database?action=tables'),
      ])

      const [statsData, tablesData] = await Promise.all([statsRes.json(), tablesRes.json()])

      const updates: any = {}
      if (statsData.success) updates.databaseStats = statsData.data
      if (tablesData.success) updates.databaseTables = tablesData.data

      if (Object.keys(updates).length > 0) {
        store.updateCachedData(updates)
      }
    } catch (_err) {
      // Silent fail
    }
  }

  // Fetch system metrics - lightweight version
  private async fetchSystemMetrics() {
    const store = useProjectStore.getState()
    if (store.projectStatus !== 'running') return

    try {
      const response = await fetch('/api/system/metrics/lite') // Use lightweight endpoint
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          store.updateCachedData({ systemMetrics: data.data })
        }
      }
    } catch (_err) {
      // Silent fail
    }
  }

  // Fetch project status - infrequent
  private async fetchProjectStatus() {
    try {
      const response = await fetch('/api/project/status')
      if (response.ok) {
        const data = await response.json()
        const store = useProjectStore.getState()

        store.updateProjectStatus({
          projectStatus: data.projectState || 'unknown',
          hasEnvFile: data.hasEnvFile,
          servicesRunning: data.servicesRunning,
          containersRunning: data.dockerContainers?.length || 0,
        })
      }
    } catch (_err) {
      // Silent fail
    }
  }

  // Update interval for a specific data source
  setInterval(key: string, interval: number) {
    const config = this.configs.get(key)
    if (config) {
      config.interval = interval

      // Restart interval if running
      if (this.isRunning && this.intervals.has(key)) {
        clearInterval(this.intervals.get(key)!)

        const intervalId = setInterval(async () => {
          try {
            await config.fetcher()
            config.lastFetch = Date.now()
          } catch (err) {
            console.warn(`[BackgroundDataService] Error updating interval for ${key}:`, err)
          }
        }, interval)

        this.intervals.set(key, intervalId)
      }
    }
  }

  // Enable/disable a data source
  setEnabled(key: string, enabled: boolean) {
    const config = this.configs.get(key)
    if (config) {
      config.enabled = enabled

      if (this.isRunning) {
        if (enabled && !this.intervals.has(key)) {
          // Start this data source
          config.fetcher().catch(() => {})

          const intervalId = setInterval(async () => {
            try {
              await config.fetcher()
              config.lastFetch = Date.now()
            } catch (err) {
              console.warn(`[BackgroundDataService] Error during setEnabled for ${key}:`, err)
            }
          }, config.interval)

          this.intervals.set(key, intervalId)
        } else if (!enabled && this.intervals.has(key)) {
          // Stop this data source
          clearInterval(this.intervals.get(key)!)
          this.intervals.delete(key)
        }
      }
    }
  }

  // Get status of all data sources
  getStatus() {
    const status: Record<string, any> = {}
    this.configs.forEach((config, key) => {
      status[key] = {
        enabled: config.enabled,
        interval: config.interval,
        lastFetch: config.lastFetch,
        age: Date.now() - config.lastFetch,
      }
    })
    return status
  }
}

// Singleton instance
export const backgroundDataService = new BackgroundDataService()
