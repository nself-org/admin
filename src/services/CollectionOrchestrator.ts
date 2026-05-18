/**
 * Collection Orchestrator
 * Central service that manages all data collectors and provides unified state
 */

import { EventEmitter } from 'events'
import { type ContainerStats, type DockerSystemInfo } from './collectors/DockerAPICollector'
import { getGlobalDockerCollector } from './globalCollectors'
import { getHasuraCollector, type HasuraStats } from './HasuraCollector'
import { getPostgresCollector, type PostgresStats } from './PostgresCollector'
import { getRedisCollector, type RedisStats } from './RedisCollector'

export interface GlobalState {
  docker: {
    containers: ContainerStats[]
    system: DockerSystemInfo | null
  }
  services: {
    postgres: PostgresStats | null
    hasura: HasuraStats | null
    redis: RedisStats | null
  }
  metrics: {
    totalCpu: number
    totalMemory: { used: number; total: number; percentage: number }
    totalNetwork: { rx: number; tx: number }
  }
  lastUpdate: number
  healthy: boolean
}

export class CollectionOrchestrator extends EventEmitter {
  private dockerCollector = getGlobalDockerCollector()
  private postgresCollector = getPostgresCollector()
  private hasuraCollector = getHasuraCollector()
  private redisCollector = getRedisCollector()

  private state: GlobalState = {
    docker: {
      containers: [],
      system: null,
    },
    services: {
      postgres: null,
      hasura: null,
      redis: null,
    },
    metrics: {
      totalCpu: 0,
      totalMemory: { used: 0, total: 0, percentage: 0 },
      totalNetwork: { rx: 0, tx: 0 },
    },
    lastUpdate: Date.now(),
    healthy: true,
  }

  private isRunning = false
  private serviceIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    super()
    this.setupDockerListeners()
  }

  /**
   * Setup Docker event listeners
   */
  private setupDockerListeners() {
    // Listen for container updates
    this.dockerCollector.on('containerStats', (container: ContainerStats) => {
      this.updateContainerInState(container)
      this.calculateAggregateMetrics()
      this.emitStateUpdate()
    })

    // Listen for system info updates
    this.dockerCollector.on('systemInfo', (info: DockerSystemInfo) => {
      this.state.docker.system = info
      this.emitStateUpdate()
    })

    // Listen for container list changes
    this.dockerCollector.on('containers', (containers: ContainerStats[]) => {
      this.state.docker.containers = containers
      this.calculateAggregateMetrics()
      this.emitStateUpdate()
    })

    // Listen for Docker events
    this.dockerCollector.on('dockerEvent', (event: any) => {
      this.emit('dockerEvent', event)
    })
  }

  /**
   * Start all collectors
   */
  async start() {
    if (this.isRunning) return

    this.isRunning = true

    try {
      // Start Docker collector (streaming)
      await this.dockerCollector.start()

      // Initial load of service data
      await this.loadServiceData()

      // Schedule periodic service updates
      this.scheduleServiceUpdates()

      this.emit('started')
    } catch (error) {
      this.isRunning = false
      throw error
    }
  }

  /**
   * Stop all collectors
   */
  async stop() {
    if (!this.isRunning) return

    this.isRunning = false

    // Stop Docker collector
    await this.dockerCollector.stop()

    // Clear service intervals
    for (const interval of this.serviceIntervals.values()) {
      clearInterval(interval)
    }
    this.serviceIntervals.clear()

    this.emit('stopped')
  }

  /**
   * Load service data (Postgres, Hasura, Redis)
   */
  private async loadServiceData() {
    const tasks = [this.loadPostgresData(), this.loadHasuraData(), this.loadRedisData()]

    await Promise.allSettled(tasks)
  }

  /**
   * Load PostgreSQL data
   */
  private async loadPostgresData() {
    try {
      const data = await this.postgresCollector.collect()
      this.state.services.postgres = data
      this.emit('serviceUpdate', { service: 'postgres', data })
    } catch (_error) {
      this.state.services.postgres = null
    }
  }

  /**
   * Load Hasura data
   */
  private async loadHasuraData() {
    try {
      const data = await this.hasuraCollector.collect()
      this.state.services.hasura = data
      this.emit('serviceUpdate', { service: 'hasura', data })
    } catch (_error) {
      this.state.services.hasura = null
    }
  }

  /**
   * Load Redis data
   */
  private async loadRedisData() {
    try {
      const data = await this.redisCollector.collect()
      this.state.services.redis = data
      this.emit('serviceUpdate', { service: 'redis', data })
    } catch (_error) {
      this.state.services.redis = null
    }
  }

  /**
   * Schedule periodic service updates
   */
  private scheduleServiceUpdates() {
    // Update Postgres every 5 seconds
    this.serviceIntervals.set(
      'postgres',
      setInterval(() => {
        if (this.isRunning) this.loadPostgresData()
      }, 5000)
    )

    // Update Hasura every 10 seconds
    this.serviceIntervals.set(
      'hasura',
      setInterval(() => {
        if (this.isRunning) this.loadHasuraData()
      }, 10000)
    )

    // Update Redis every 5 seconds
    this.serviceIntervals.set(
      'redis',
      setInterval(() => {
        if (this.isRunning) this.loadRedisData()
      }, 5000)
    )
  }

  /**
   * Update container in state
   */
  private updateContainerInState(updatedContainer: ContainerStats) {
    const index = this.state.docker.containers.findIndex((c) => c.id === updatedContainer.id)
    if (index >= 0) {
      this.state.docker.containers[index] = updatedContainer
    } else {
      this.state.docker.containers.push(updatedContainer)
    }
  }

  /**
   * Calculate aggregate metrics from all containers
   */
  private calculateAggregateMetrics() {
    let totalCpu = 0
    let totalMemUsed = 0
    let totalMemLimit = 0
    let totalRx = 0
    let totalTx = 0

    for (const container of this.state.docker.containers) {
      if (container.status === 'running') {
        totalCpu += container.cpu
        totalMemUsed += container.memory.used
        totalMemLimit += container.memory.limit
        totalRx += container.network.rx
        totalTx += container.network.tx
      }
    }

    this.state.metrics = {
      totalCpu: Math.round(totalCpu * 10) / 10,
      totalMemory: {
        used: Math.round(totalMemUsed * 100) / 100,
        total: Math.round(totalMemLimit * 100) / 100,
        percentage: totalMemLimit > 0 ? Math.round((totalMemUsed / totalMemLimit) * 100) : 0,
      },
      totalNetwork: {
        rx: Math.round(totalRx * 10) / 10,
        tx: Math.round(totalTx * 10) / 10,
      },
    }
  }

  /**
   * Emit state update
   */
  private emitStateUpdate() {
    this.state.lastUpdate = Date.now()
    this.emit('stateUpdate', this.getState())
  }

  /**
   * Get current state
   */
  getState(): GlobalState {
    return { ...this.state }
  }

  /**
   * Get specific service data
   */
  getService(name: keyof GlobalState['services']) {
    return this.state.services[name]
  }

  /**
   * Get container by ID
   */
  getContainer(id: string): ContainerStats | undefined {
    return this.state.docker.containers.find((c) => c.id === id)
  }

  /**
   * Check if orchestrator is running
   */
  isActive(): boolean {
    return this.isRunning
  }

  /**
   * Force refresh of all data
   */
  async refresh() {
    await this.loadServiceData()
    const dockerSnapshot = this.dockerCollector.getSnapshot()
    this.state.docker.containers = dockerSnapshot.containers
    this.state.docker.system = dockerSnapshot.systemInfo
    this.calculateAggregateMetrics()
    this.emitStateUpdate()
  }
}

// Singleton instance
let orchestrator: CollectionOrchestrator | null = null

export function getCollectionOrchestrator(): CollectionOrchestrator {
  if (!orchestrator) {
    orchestrator = new CollectionOrchestrator()
  }
  return orchestrator
}
