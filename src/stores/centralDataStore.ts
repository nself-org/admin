import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Types for all service data
export interface DockerMetrics {
  cpu: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  storage: {
    used: number
    total: number
    percentage: number
  }
  network: {
    rx: number
    tx: number
    maxSpeed: number
  }
  containers: {
    total: number
    running: number
    stopped: number
    healthy: number
    unhealthy: number
  }
}

export interface SystemMetrics {
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
    maxSpeed: number
  }
  uptime: number
}

export interface ContainerInfo {
  id: string
  name: string
  image: string
  state: 'running' | 'stopped' | 'restarting'
  status: string
  health: 'healthy' | 'unhealthy' | 'starting' | 'none'
  cpu: number
  memory: {
    usage: string
    limit: string
    percentage: number
  }
  ports: Array<{
    private: number
    public: number
    type: string
  }>
  created: string
  uptime: string
  restartCount: number
  serviceType: string
  category: 'required' | 'optional' | 'user'
}

export interface PostgresMetrics {
  status: 'healthy' | 'unhealthy' | 'stopped'
  connections: {
    active: number
    idle: number
    max: number
  }
  databaseSize: string
  tableCount: number
  queryStats: {
    totalQueries: number
    slowQueries: number
    averageTime: number
  }
  replication?: {
    lag: number
    status: string
  }
}

export interface HasuraMetrics {
  status: 'healthy' | 'unhealthy' | 'stopped'
  metadata: {
    tables: number
    relationships: number
    permissions: number
    actions: number
    eventTriggers: number
  }
  performance: {
    requestRate: number
    errorRate: number
    p95ResponseTime: number
    activeSubscriptions: number
  }
  inconsistentObjects: any[]
}

export interface RedisMetrics {
  status: 'healthy' | 'unhealthy' | 'stopped'
  memory: {
    used: number
    peak: number
    fragmentation: number
  }
  clients: number
  opsPerSecond: number
  hitRate: number
  evictedKeys: number
  keyspaceInfo: Record<string, { keys: number; expires: number }>
}

export interface ServiceHealth {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded' | 'stopped'
  lastCheck: Date
  message?: string
  details?: any
}

export interface Alert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  service: string
  message: string
  timestamp: Date
  acknowledged: boolean
}

interface CentralDataState {
  // Core metrics
  docker: DockerMetrics | null
  system: SystemMetrics | null
  containers: ContainerInfo[]

  // Service-specific metrics
  postgres: PostgresMetrics | null
  hasura: HasuraMetrics | null
  redis: RedisMetrics | null

  // Computed/derived data
  servicesHealth: ServiceHealth[]
  alerts: Alert[]

  // Metadata
  lastUpdate: Date | null
  isConnected: boolean
  connectionError: string | null

  // Performance tracking
  apiCallsCount: number
  cacheHits: number
  cacheMisses: number
}

interface CentralDataActions {
  // Update methods
  updateDocker: (metrics: DockerMetrics) => void
  updateSystem: (metrics: SystemMetrics) => void
  updateContainers: (containers: ContainerInfo[]) => void
  updatePostgres: (metrics: PostgresMetrics) => void
  updateHasura: (metrics: HasuraMetrics) => void
  updateRedis: (metrics: RedisMetrics) => void

  // Batch update for efficiency
  batchUpdate: (updates: Partial<CentralDataState>) => void

  // SSE update handler
  updateFromSSE: (data: any) => void

  // Alert management
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void
  acknowledgeAlert: (id: string) => void
  clearAlerts: (service?: string) => void

  // Connection management
  setConnected: (connected: boolean, error?: string) => void

  // Performance tracking
  trackApiCall: () => void
  trackCacheHit: () => void
  trackCacheMiss: () => void

  // Reset
  reset: () => void
}

export type CentralDataStore = CentralDataState & CentralDataActions

// Initial state with defaults
const initialState: CentralDataState = {
  docker: null,
  system: null,
  containers: [],
  postgres: null,
  hasura: null,
  redis: null,
  servicesHealth: [],
  alerts: [],
  lastUpdate: null,
  isConnected: false,
  connectionError: null,
  apiCallsCount: 0,
  cacheHits: 0,
  cacheMisses: 0,
}

// Create the store with immer for immutability and subscribeWithSelector for granular subscriptions
export const useCentralDataStore = create<CentralDataStore>()(
  subscribeWithSelector(
    immer((set, _get) => ({
      ...initialState,

      updateDocker: (metrics) =>
        set((state) => {
          state.docker = metrics
          state.lastUpdate = new Date()
        }),

      updateSystem: (metrics) =>
        set((state) => {
          state.system = metrics
          state.lastUpdate = new Date()
        }),

      updateContainers: (containers) =>
        set((state) => {
          state.containers = containers
          state.lastUpdate = new Date()

          // Auto-compute service health from containers
          const healthMap = new Map<string, ServiceHealth>()

          containers.forEach((container) => {
            const service = container.name.replace(/^nself[_-]/i, '')
            healthMap.set(service, {
              name: service,
              status:
                container.health === 'healthy'
                  ? 'healthy'
                  : container.health === 'unhealthy'
                    ? 'unhealthy'
                    : container.state === 'running'
                      ? 'degraded'
                      : 'stopped',
              lastCheck: new Date(),
              message: container.status,
            })
          })

          state.servicesHealth = Array.from(healthMap.values())
        }),

      updatePostgres: (metrics) =>
        set((state) => {
          state.postgres = metrics
          state.lastUpdate = new Date()
        }),

      updateHasura: (metrics) =>
        set((state) => {
          state.hasura = metrics
          state.lastUpdate = new Date()
        }),

      updateRedis: (metrics) =>
        set((state) => {
          state.redis = metrics
          state.lastUpdate = new Date()
        }),

      batchUpdate: (updates) =>
        set((state) => {
          Object.assign(state, updates)
          state.lastUpdate = new Date()
        }),

      updateFromSSE: (data) =>
        set((state) => {
          // Handle SSE data from the orchestrator
          if (data.docker) {
            // Update Docker containers and system info
            if (data.docker.containers) {
              // Map containers from orchestrator format to store format
              state.containers = data.docker.containers.map((c: any) => ({
                id: c.id,
                name: c.name,
                image: 'unknown', // Not provided by orchestrator yet
                state:
                  c.status === 'running'
                    ? 'running'
                    : c.status === 'stopped'
                      ? 'stopped'
                      : 'restarting',
                status: c.status,
                health: c.health || 'none',
                cpu: c.cpu,
                memory: {
                  usage: `${c.memory.used.toFixed(2)}GB`,
                  limit: `${c.memory.limit.toFixed(2)}GB`,
                  percentage: c.memory.percentage,
                },
                ports: [], // Not provided yet
                created: '',
                uptime: c.uptime || '',
                restartCount: c.restartCount || 0,
                serviceType: c.name.includes('postgres')
                  ? 'postgres'
                  : c.name.includes('hasura')
                    ? 'hasura'
                    : c.name.includes('redis')
                      ? 'redis'
                      : c.name.includes('auth')
                        ? 'auth'
                        : c.name.includes('nginx')
                          ? 'nginx'
                          : c.name.includes('minio')
                            ? 'storage'
                            : 'other',
                category:
                  c.name.includes('postgres') ||
                  c.name.includes('hasura') ||
                  c.name.includes('auth') ||
                  c.name.includes('nginx')
                    ? 'required'
                    : c.name.includes('redis') ||
                        c.name.includes('minio') ||
                        c.name.includes('mailpit')
                      ? 'optional'
                      : 'user',
              }))

              // Auto-compute service health
              const healthMap = new Map()
              state.containers.forEach((container) => {
                const service = container.name.replace(/^nself[_-]/i, '')
                healthMap.set(service, {
                  name: service,
                  status:
                    container.health === 'healthy'
                      ? 'healthy'
                      : container.health === 'unhealthy'
                        ? 'unhealthy'
                        : container.state === 'running'
                          ? 'degraded'
                          : 'stopped',
                  lastCheck: new Date(),
                  message: container.status,
                })
              })
              state.servicesHealth = Array.from(healthMap.values())
            }

            if (data.docker.system) {
              // Map system info to Docker metrics
              state.docker = {
                cpu: data.metrics?.totalCpu || 0,
                memory: data.metrics?.totalMemory || {
                  used: 0,
                  total: 0,
                  percentage: 0,
                },
                storage: data.metrics?.totalStorage || {
                  used: 0,
                  total: 50,
                  percentage: 0,
                },
                network: data.metrics?.totalNetwork || {
                  rx: 0,
                  tx: 0,
                  maxSpeed: 1000,
                },
                containers: {
                  total: data.docker.system.containers.total,
                  running: data.docker.system.containers.running,
                  stopped: data.docker.system.containers.stopped,
                  healthy: state.containers.filter((c) => c.health === 'healthy').length,
                  unhealthy: state.containers.filter((c) => c.health === 'unhealthy').length,
                },
              }
            }
          }

          // Update services
          if (data.services) {
            if (data.services.postgres) state.postgres = data.services.postgres
            if (data.services.hasura) state.hasura = data.services.hasura
            if (data.services.redis) state.redis = data.services.redis
          }

          // Update metrics if provided
          if (data.metrics) {
            // Metrics are already handled above in docker section
          }

          state.lastUpdate = new Date(data.lastUpdate || Date.now())
          state.isConnected = true
          state.connectionError = null
        }),

      addAlert: (alert) =>
        set((state) => {
          const newAlert: Alert = {
            ...alert,
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            acknowledged: false,
          }
          state.alerts.unshift(newAlert)

          // Keep only last 100 alerts
          if (state.alerts.length > 100) {
            state.alerts = state.alerts.slice(0, 100)
          }
        }),

      acknowledgeAlert: (id) =>
        set((state) => {
          const alert = state.alerts.find((a) => a.id === id)
          if (alert) {
            alert.acknowledged = true
          }
        }),

      clearAlerts: (service) =>
        set((state) => {
          if (service) {
            state.alerts = state.alerts.filter((a) => a.service !== service)
          } else {
            state.alerts = []
          }
        }),

      setConnected: (connected, error) =>
        set((state) => {
          state.isConnected = connected
          state.connectionError = error || null

          if (!connected && error) {
            // Add connection error as alert
            const alert: Alert = {
              id: `conn-${Date.now()}`,
              severity: 'critical',
              service: 'system',
              message: `Connection lost: ${error}`,
              timestamp: new Date(),
              acknowledged: false,
            }
            state.alerts.unshift(alert)
          }
        }),

      trackApiCall: () =>
        set((state) => {
          state.apiCallsCount++
        }),

      trackCacheHit: () =>
        set((state) => {
          state.cacheHits++
        }),

      trackCacheMiss: () =>
        set((state) => {
          state.cacheMisses++
        }),

      reset: () => set(() => initialState),
    }))
  )
)

// Selector hooks for common data needs
export const useDockerMetrics = () => useCentralDataStore((state) => state.docker)
export const useSystemMetrics = () => useCentralDataStore((state) => state.system)
export const useContainers = () => useCentralDataStore((state) => state.containers)
export const useServicesHealth = () => useCentralDataStore((state) => state.servicesHealth)
export const useAlerts = () => useCentralDataStore((state) => state.alerts)
export const useConnectionStatus = () =>
  useCentralDataStore((state) => ({
    isConnected: state.isConnected,
    error: state.connectionError,
  }))
