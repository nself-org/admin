// Smart Data Fetching Service with Deduplication and Caching
// This service ensures data is fetched efficiently without duplicates

import { useProjectStore } from '@/stores/projectStore'

interface FetchOptions {
  force?: boolean // Force fetch even if cache is fresh
  maxAge?: number // Maximum age of cache in ms (default: 2000ms)
}

interface FetchRecord {
  timestamp: number
  promise?: Promise<any>
}

class DataFetchService {
  private fetchRecords: Map<string, FetchRecord> = new Map()
  private defaultMaxAge = 2000 // 2 seconds default cache

  // Check if data is fresh enough
  private isFresh(key: string, maxAge: number): boolean {
    const record = this.fetchRecords.get(key)
    if (!record) return false

    const age = Date.now() - record.timestamp
    return age < maxAge
  }

  // Deduplicated fetch - prevents multiple simultaneous fetches
  private async dedupedFetch(
    key: string,
    fetcher: () => Promise<any>,
    maxAge: number
  ): Promise<any> {
    const record = this.fetchRecords.get(key)

    // If there's an ongoing fetch, return that promise
    if (record?.promise) {
      return record.promise
    }

    // If data is fresh, don't fetch
    if (this.isFresh(key, maxAge)) {
      return Promise.resolve(null)
    }

    // Start new fetch
    const promise = fetcher()
      .then((result) => {
        // Update timestamp on success
        this.fetchRecords.set(key, { timestamp: Date.now() })
        return result
      })
      .catch((error) => {
        // Clear promise on error so it can be retried
        const currentRecord = this.fetchRecords.get(key)
        if (currentRecord?.promise === promise) {
          currentRecord.promise = undefined
        }
        throw error
      })

    // Store the promise
    this.fetchRecords.set(key, {
      timestamp: record?.timestamp || 0,
      promise,
    })

    return promise
  }

  // Fetch container data
  async fetchContainers(options: FetchOptions = {}) {
    const { force = false, maxAge = this.defaultMaxAge } = options

    if (force) {
      this.fetchRecords.delete('containers')
    }

    return this.dedupedFetch(
      'containers',
      async () => {
        const store = useProjectStore.getState()
        if (store.projectStatus !== 'running') return null

        const response = await fetch('/api/docker/containers?detailed=true&stats=false')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            // Group containers by category
            const byCategory: Record<string, any[]> = {}
            data.data.containers.forEach((container: any) => {
              const category = container.category || 'services'
              if (!byCategory[category]) {
                byCategory[category] = []
              }
              byCategory[category].push(container)
            })

            store.updateCachedData({
              containerStats: data.data.containers,
            })

            return data.data
          }
        }
        return null
      },
      maxAge
    )
  }

  // Fetch container stats (CPU/Memory)
  async fetchContainerStats(options: FetchOptions = {}) {
    const { force = false, maxAge = 10000 } = options // 10s cache for expensive stats

    if (force) {
      this.fetchRecords.delete('containerStats')
    }

    return this.dedupedFetch(
      'containerStats',
      async () => {
        const store = useProjectStore.getState()
        if (store.projectStatus !== 'running') return null

        const response = await fetch('/api/docker/containers?detailed=true&stats=true')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            // Merge stats into existing container data
            const currentContainers = store.containerStats || []
            const updatedContainers = currentContainers.map((container) => {
              const statsContainer = data.data.containers.find((c: any) => c.id === container.id)
              if (statsContainer) {
                return { ...container, ...statsContainer }
              }
              return container
            })

            store.updateCachedData({
              containerStats: updatedContainers,
            })

            return data.data
          }
        }
        return null
      },
      maxAge
    )
  }

  // Fetch database info
  async fetchDatabase(options: FetchOptions = {}) {
    const { force = false, maxAge = 5000 } = options // 5s cache for database

    if (force) {
      this.fetchRecords.delete('database')
    }

    return this.dedupedFetch(
      'database',
      async () => {
        const store = useProjectStore.getState()
        if (store.projectStatus !== 'running') return null

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

        return updates
      },
      maxAge
    )
  }

  // Fetch system metrics - ALL metrics including Docker
  async fetchSystemMetrics(options: FetchOptions = {}) {
    const { force = false, maxAge = 2000 } = options // 2s cache for metrics

    if (force) {
      this.fetchRecords.delete('systemMetrics')
    }

    return this.dedupedFetch(
      'systemMetrics',
      async () => {
        const store = useProjectStore.getState()
        if (store.projectStatus !== 'running') return null

        // Use full endpoint to get all metrics in one call (system + Docker)
        const response = await fetch('/api/system/metrics')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            store.updateCachedData({ systemMetrics: data.data })
            return data.data
          }
        }
        return null
      },
      maxAge
    )
  }

  // DEPRECATED: Docker metrics are now included in fetchSystemMetrics
  // Keeping for backward compatibility but not used
  async fetchDockerMetrics(_options: FetchOptions = {}) {
    // Docker metrics are now fetched as part of fetchSystemMetrics
    // to avoid duplicate fetching and oscillation
    return null
  }

  // Fetch project status
  async fetchProjectStatus(options: FetchOptions = {}) {
    const { force = false, maxAge = 30000 } = options // 30s cache for project status

    if (force) {
      this.fetchRecords.delete('projectStatus')
    }

    return this.dedupedFetch(
      'projectStatus',
      async () => {
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

          return data
        }
        return null
      },
      maxAge
    )
  }

  // Clear all cache
  clearCache() {
    this.fetchRecords.clear()
  }

  // Clear specific cache
  clearCacheFor(key: string) {
    this.fetchRecords.delete(key)
  }
}

// Singleton instance
export const dataFetchService = new DataFetchService()
