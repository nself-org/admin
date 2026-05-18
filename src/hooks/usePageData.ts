import { dataFetchService } from '@/services/DataFetchService'
import { useProjectStore } from '@/stores/projectStore'
import { useCallback, useEffect, useRef } from 'react'

interface PageDataOptions {
  containers?: boolean | { maxAge?: number }
  containerStats?: boolean | { maxAge?: number }
  database?: boolean | { maxAge?: number }
  systemMetrics?: boolean | { maxAge?: number }
  dockerMetrics?: boolean | { maxAge?: number }
  projectStatus?: boolean | { maxAge?: number }
  refreshInterval?: number // Optional auto-refresh interval
}

export function usePageData(options: PageDataOptions) {
  const projectStatus = useProjectStore((state) => state.projectStatus)
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Fetch data based on options
  const fetchData = useCallback(async () => {
    if (projectStatus !== 'running' && !options.projectStatus) {
      return
    }

    const promises: Promise<any>[] = []

    if (options.containers) {
      const opts = typeof options.containers === 'object' ? options.containers : {}
      promises.push(dataFetchService.fetchContainers(opts))
    }

    if (options.containerStats) {
      const opts = typeof options.containerStats === 'object' ? options.containerStats : {}
      promises.push(dataFetchService.fetchContainerStats(opts))
    }

    if (options.database) {
      const opts = typeof options.database === 'object' ? options.database : {}
      promises.push(dataFetchService.fetchDatabase(opts))
    }

    if (options.systemMetrics) {
      const opts = typeof options.systemMetrics === 'object' ? options.systemMetrics : {}
      promises.push(dataFetchService.fetchSystemMetrics(opts))
    }

    if (options.dockerMetrics) {
      const opts = typeof options.dockerMetrics === 'object' ? options.dockerMetrics : {}
      promises.push(dataFetchService.fetchDockerMetrics(opts))
    }

    if (options.projectStatus) {
      const opts = typeof options.projectStatus === 'object' ? options.projectStatus : {}
      promises.push(dataFetchService.fetchProjectStatus(opts))
    }

    // Fetch all in parallel
    await Promise.all(promises)
  }, [projectStatus, options])

  useEffect(() => {
    // Initial fetch
    fetchData()

    // Set up refresh interval if specified
    if (options.refreshInterval && options.refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, options.refreshInterval)
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [projectStatus, options.refreshInterval, fetchData])

  // Return manual refresh function
  return {
    refresh: () => fetchData(),
    forceRefresh: () => {
      // Clear cache and fetch
      dataFetchService.clearCache()
      return fetchData()
    },
  }
}
