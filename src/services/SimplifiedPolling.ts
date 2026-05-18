// Simplified polling service that doesn't block navigation
import { useProjectStore } from '@/stores/projectStore'

class SimplifiedPollingService {
  private pollingTimeout: NodeJS.Timeout | null = null
  private isActive = false
  private abortController: AbortController | null = null

  start() {
    if (this.isActive) return
    this.isActive = true
    // Fetch immediately
    this.fetchData()
    // Then start regular polling
    this.pollOnce()
  }

  stop() {
    this.isActive = false
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout)
      this.pollingTimeout = null
    }
    // Abort any in-flight requests
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  private async pollOnce() {
    if (!this.isActive) return

    try {
      // Only fetch if we're on a page that needs it
      const pathname = window.location.pathname
      const needsData = ['/', '/dashboard', '/services'].includes(pathname)

      if (needsData) {
        // Use requestIdleCallback to not block the main thread
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => this.fetchData(), { timeout: 2000 })
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(() => this.fetchData(), 100)
        }
      }
    } catch (error) {
      console.warn('[SimplifiedPolling] Error checking page needs data:', error)
    }

    // Schedule next poll
    if (this.isActive) {
      this.pollingTimeout = setTimeout(() => this.pollOnce(), 2000) // Poll every 2 seconds
    }
  }

  private async fetchData() {
    const store = useProjectStore.getState()

    // Create new abort controller for this fetch cycle
    this.abortController = new AbortController()

    try {
      // Check if we should abort early (e.g. page change)
      if (!this.isActive || !this.abortController) return

      // Fetch both metrics and containers in parallel with shorter timeout
      const [metricsRes, containersRes, statusRes] = await Promise.all([
        fetch('/api/system/metrics', {
          signal: AbortSignal.timeout(1500),
        }).catch(() => null), // Silently ignore all errors
        fetch('/api/docker/containers?detailed=true', {
          signal: AbortSignal.timeout(1500),
        }).catch(() => null), // Silently ignore all errors
        fetch('/api/project/status', {
          signal: AbortSignal.timeout(1000),
        }).catch(() => null), // Silently ignore all errors
      ])

      // Process metrics
      if (metricsRes && metricsRes.ok) {
        try {
          const data = await metricsRes.json()
          if (data.success && data.data) {
            store.updateCachedData({
              systemMetrics: data.data,
            })
          }
        } catch (e) {
          console.warn('[SimplifiedPolling] Error parsing metrics response:', e)
        }
      }

      // Process containers
      if (containersRes && containersRes.ok) {
        try {
          const data = await containersRes.json()
          if (data.success) {
            store.updateCachedData({
              containerStats: data.data?.containers || [],
            })
          }
        } catch (e) {
          console.warn('[SimplifiedPolling] Error parsing containers response:', e)
        }
      }

      // Process status
      if (statusRes && statusRes.ok) {
        try {
          const data = await statusRes.json()
          if (data.success) {
            // API returns projectState, not status
            if (data.projectState) {
              store.setProjectStatus(data.projectState)
            }
            store.setProjectInfo(data.projectInfo || data.config)
          }
        } catch (e) {
          console.warn('[SimplifiedPolling] Error parsing status response:', e)
        }
      }
    } catch (_error) {
      // Silently ignore all errors to prevent console spam
      return
    }
  }
}

export const simplifiedPolling = new SimplifiedPollingService()

// Don't auto-start - let GlobalDataProvider manage polling based on auth state
// The service will be started when:
// 1. User is authenticated AND
// 2. Project status is 'running'
