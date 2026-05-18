import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ProjectStatus =
  | 'not_initialized'
  | 'initialized'
  | 'built'
  | 'running'
  | 'stopped'
  | 'error'

interface SystemMetrics {
  system?: {
    cpu: number
    memory: {
      used: number
      total: number
      percentage: number
    }
    disk: {
      used: number
      total: number
      percentage: number
    }
    network: {
      rx: number
      tx: number
      maxSpeed?: number
    }
  }
  docker?: {
    cpu: number
    memory: {
      used: number
      total: number
      percentage: number
    }
    network: {
      rx: number
      tx: number
    }
    storage: {
      used: number
      total: number
    }
    containers: number
  }
  timestamp?: string
}

interface ContainerStats {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports: any[]
  stats?: {
    cpu: { percentage: number }
    memory: { usage: number; limit: number; percentage: number }
    network: { rx: number; tx: number }
    blockIO: { read: number; write: number }
  }
  health?: string
  category?: string
  serviceType?: string
}

interface DatabaseStats {
  size: string
  tables: number
  views: number
  connections: number
  uptime: string
  version: string
}

interface DatabaseTable {
  name: string
  schema: string
  type: 'table' | 'view'
  rowCount: number
  size: string
  columns: number
}

interface ProjectState {
  // Project setup state
  projectStatus: ProjectStatus
  projectSetup: boolean
  lastChecked: Date | null
  isChecking: boolean
  projectInfo: any | null

  // Environment state
  hasEnvFile: boolean
  hasDockerCompose: boolean
  containersRunning: number
  totalContainers: number
  servicesRunning: boolean

  // Cached data - always available
  systemMetrics: SystemMetrics | null
  containerStats: ContainerStats[]
  containersByCategory: Record<string, ContainerStats[]>
  databaseStats: DatabaseStats | null
  databaseTables: DatabaseTable[]
  lastDataUpdate: Date | null

  // Loading states for UI
  isLoadingMetrics: boolean
  isLoadingContainers: boolean
  isLoadingDatabase: boolean

  // Background refresh
  refreshInterval: NodeJS.Timeout | null
  pollingRate: number // milliseconds

  // Actions
  checkProjectStatus: () => Promise<void>
  updateProjectStatus: (status: Partial<ProjectState>) => void
  setProjectSetup: (setup: boolean) => void
  setProjectInfo: (info: any) => void
  setProjectStatus: (status: ProjectStatus) => void

  // Data fetching
  fetchSystemMetrics: () => Promise<void>
  fetchContainerStats: () => Promise<void>
  fetchDatabaseStats: () => Promise<void>
  fetchAllData: () => Promise<void>

  // Cache management
  updateCachedData: (
    data: Partial<{
      systemMetrics: SystemMetrics | null
      containerStats: ContainerStats[]
      databaseStats: DatabaseStats | null
      databaseTables: DatabaseTable[]
      lastDockerUpdate?: number
    }>
  ) => void

  // Background polling
  startBackgroundRefresh: (intervalMs?: number) => void
  stopBackgroundRefresh: () => void
  setPollingRate: (ms: number) => void

  reset: () => void
}

const initialState = {
  projectStatus: 'not_initialized' as ProjectStatus,
  projectSetup: false,
  lastChecked: null,
  isChecking: false,
  projectInfo: null,
  hasEnvFile: false,
  hasDockerCompose: false,
  containersRunning: 0,
  totalContainers: 0,
  servicesRunning: false,
  systemMetrics: null,
  containerStats: [],
  containersByCategory: {},
  databaseStats: null,
  databaseTables: [],
  lastDataUpdate: null,
  isLoadingMetrics: false,
  isLoadingContainers: false,
  isLoadingDatabase: false,
  refreshInterval: null,
  pollingRate: 2000, // Default 2 seconds
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      ...initialState,

      checkProjectStatus: async () => {
        set({ isChecking: true })

        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

          const statusRes = await fetch('/api/project/status', {
            signal: controller.signal,
          }).catch((error) => {
            if (error.name === 'AbortError') {
              return null
            }
            throw error
          })

          clearTimeout(timeoutId)

          if (!statusRes) {
            set({ isChecking: false })
            return
          }

          // Skip processing if we get a 401 (not authenticated)
          if (statusRes.status === 401) {
            set({ isChecking: false })
            return
          }

          const statusData = await statusRes.json()

          let projectStatus: ProjectStatus = 'not_initialized'

          // Use servicesRunning and dockerContainers from the API response
          const isRunning =
            statusData.servicesRunning ||
            (statusData.dockerContainers && statusData.dockerContainers.length > 0)
          const containerCount = statusData.dockerContainers
            ? statusData.dockerContainers.length
            : 0

          // If we have running containers, consider it running regardless of env file
          if (isRunning && containerCount > 0) {
            projectStatus = 'running'
          } else if (statusData.hasEnvFile && isRunning) {
            projectStatus = 'running'
          } else if (statusData.hasEnvFile && statusData.summary?.built) {
            projectStatus = 'stopped'
          } else if (statusData.hasEnvFile && statusData.config?.projectName) {
            projectStatus = 'built'
          } else if (statusData.hasEnvFile) {
            projectStatus = 'initialized'
          }

          // Only update containersRunning if we have a reliable count
          // Don't overwrite with 0 if we know services are running
          const currentState = get()
          const reliableContainerCount =
            containerCount > 0
              ? containerCount
              : currentState.containerStats.length > 0
                ? currentState.containerStats.length
                : containerCount

          set({
            projectStatus,
            projectSetup: projectStatus !== 'not_initialized',
            hasEnvFile: statusData.hasEnvFile,
            hasDockerCompose: statusData.summary?.built || false,
            containersRunning: reliableContainerCount,
            totalContainers: reliableContainerCount,
            servicesRunning: statusData.servicesRunning || reliableContainerCount > 0,
            lastChecked: new Date(),
            isChecking: false,
          })

          // Pages now handle their own data fetching with deduplication
          // We don't automatically fetch all data here anymore
          // if (projectStatus === 'running') {
          //   get().fetchAllData()
          // }
        } catch (_error) {
          set({
            projectStatus: 'error',
            isChecking: false,
            lastChecked: new Date(),
          })
        }
      },

      fetchSystemMetrics: async () => {
        const state = get()
        // Allow fetching metrics if we have any indication the system is set up
        // This is more permissive to handle cases where projectStatus isn't updated yet
        if (state.projectStatus === 'not_initialized') {
          return
        }

        set({ isLoadingMetrics: true })

        try {
          const controller = new AbortController()
          const response = await fetch('/api/system/metrics', {
            signal: controller.signal,
          }).catch((error) => {
            if (error.name === 'AbortError') return null
            throw error
          })

          if (response && response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
              set({
                systemMetrics: data.data,
                isLoadingMetrics: false,
              })
            } else {
              // API returned unsuccessful response, keep existing data
              set({ isLoadingMetrics: false })
            }
          } else {
            // Request failed, keep existing data
            set({ isLoadingMetrics: false })
          }
        } catch (error) {
          // Exception occurred, keep existing data
          console.warn('[ProjectStore] fetchSystemMetrics failed:', error)
          set({ isLoadingMetrics: false })
        }
      },

      fetchContainerStats: async () => {
        const state = get()
        // Allow fetching containers if we have any indication services might be running
        // This is more permissive to handle cases where projectStatus isn't updated yet
        if (state.projectStatus === 'not_initialized') return

        set({ isLoadingContainers: true })

        try {
          const controller = new AbortController()
          const response = await fetch('/api/docker/containers?detailed=true&stats=true', {
            signal: controller.signal,
          }).catch((error) => {
            if (error.name === 'AbortError') return null
            throw error
          })

          if (response && response.ok) {
            const data = await response.json()
            if (data.success && Array.isArray(data.data)) {
              // Only update if we actually got container data
              // Never replace existing data with empty array unless we're sure there are no containers
              if (
                data.data.length > 0 ||
                (data.data.length === 0 && state.projectStatus !== 'running')
              ) {
                // Group containers by category
                const byCategory: Record<string, ContainerStats[]> = {}
                data.data.forEach((container: ContainerStats) => {
                  const category = container.category || 'services'
                  if (!byCategory[category]) {
                    byCategory[category] = []
                  }
                  byCategory[category].push(container)
                })

                set({
                  containerStats: data.data,
                  containersByCategory: byCategory,
                  isLoadingContainers: false,
                })
              } else {
                // Got empty array but project is running - keep existing data
                set({ isLoadingContainers: false })
              }
            } else {
              // API returned unsuccessful response, keep existing data
              set({ isLoadingContainers: false })
            }
          } else {
            // Request failed, keep existing data
            set({ isLoadingContainers: false })
          }
        } catch (error) {
          // Exception occurred, keep existing data
          console.warn('[ProjectStore] fetchContainerStats failed:', error)
          set({ isLoadingContainers: false })
        }
      },

      fetchDatabaseStats: async () => {
        const state = get()
        if (state.projectStatus !== 'running') return

        set({ isLoadingDatabase: true })

        try {
          const controller = new AbortController()

          // Fetch both stats and tables in parallel with abort support
          const [statsRes, tablesRes] = await Promise.all([
            fetch('/api/database?action=stats', {
              signal: controller.signal,
            }).catch((e) => (e.name === 'AbortError' ? null : Promise.reject(e))),
            fetch('/api/database?action=tables', {
              signal: controller.signal,
            }).catch((e) => (e.name === 'AbortError' ? null : Promise.reject(e))),
          ])

          if (statsRes && statsRes.ok) {
            const statsData = await statsRes.json()
            if (statsData.success) {
              set({ databaseStats: statsData.data })
            }
          }

          if (tablesRes && tablesRes.ok) {
            const tablesData = await tablesRes.json()
            if (tablesData.success) {
              set({ databaseTables: tablesData.data })
            }
          }

          set({ isLoadingDatabase: false })
        } catch (_error) {
          set({ isLoadingDatabase: false })
        }
      },

      fetchAllData: async () => {
        const state = get()

        // Be more permissive - only skip if completely not initialized
        // This allows dashboard to load data even if projectStatus is uncertain
        if (state.projectStatus === 'not_initialized') {
          return
        }

        // Fetch all data in parallel
        await Promise.all([
          state.fetchSystemMetrics(),
          state.fetchContainerStats(),
          state.fetchDatabaseStats(),
        ])

        set({ lastDataUpdate: new Date() })
      },

      updateProjectStatus: (status) => set(status),

      setProjectSetup: (setup) => set({ projectSetup: setup }),

      setProjectInfo: (info) => set({ projectInfo: info }),

      setProjectStatus: (status) => set({ projectStatus: status }),

      updateCachedData: (data) =>
        set({
          ...data,
          lastDataUpdate: new Date(),
        }),

      setPollingRate: (ms) => {
        set({ pollingRate: ms })
        // Restart polling with new rate if active
        const state = get()
        if (state.refreshInterval) {
          state.stopBackgroundRefresh()
          state.startBackgroundRefresh(ms)
        }
      },

      startBackgroundRefresh: (intervalMs) => {
        const state = get()
        const { refreshInterval, stopBackgroundRefresh, fetchAllData, pollingRate } = state

        // Clear existing interval
        if (refreshInterval) {
          stopBackgroundRefresh()
        }

        // Use provided interval or default polling rate
        const interval = intervalMs || pollingRate

        // Start immediate fetch
        fetchAllData()

        // Start new interval
        const newInterval = setInterval(() => {
          fetchAllData()
        }, interval)

        set({ refreshInterval: newInterval })
      },

      stopBackgroundRefresh: () => {
        const { refreshInterval } = get()
        if (refreshInterval) {
          clearInterval(refreshInterval)
          set({ refreshInterval: null })
        }
      },

      reset: () => {
        const { stopBackgroundRefresh } = get()
        stopBackgroundRefresh()
        set(initialState)
      },
    }),
    {
      name: 'nself-project-store',
      partialize: (state) => ({
        projectSetup: state.projectSetup,
        projectStatus: state.projectStatus,
        pollingRate: state.pollingRate,
      }),
    }
  )
)
