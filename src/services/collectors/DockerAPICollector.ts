/**
 * Docker API Collector
 * Uses Dockerode SDK for efficient streaming of Docker metrics
 * Replaces exec-based collection with proper API streams
 */

import Docker from 'dockerode'
import { EventEmitter } from 'events'

export interface ContainerStats {
  id: string
  name: string
  status: 'running' | 'stopped' | 'paused' | 'restarting' | 'dead'
  health?: 'healthy' | 'unhealthy' | 'starting' | 'none'
  cpu: number
  memory: {
    used: number // GB
    limit: number // GB
    percentage: number
  }
  network: {
    rx: number // MB
    tx: number // MB
  }
  blockIO: {
    read: number // MB
    write: number // MB
  }
  pids: number
  restartCount: number
  uptime: string
}

export interface DockerSystemInfo {
  containers: {
    total: number
    running: number
    stopped: number
    paused: number
  }
  images: number
  volumes: number
  networks: number
  cpus: number
  memoryTotal: number // GB
  dockerVersion: string
  storageDriver: string
}

export class DockerAPICollector extends EventEmitter {
  private docker: Docker
  private statsStreams: Map<string, any> = new Map()
  private containers: Map<string, ContainerStats> = new Map()
  private systemInfo: DockerSystemInfo | null = null
  private isRunning = false
  private eventStream: any = null
  private updateInterval: NodeJS.Timeout | null = null

  constructor() {
    super()

    // Determine Docker socket path based on platform
    const socketPath = this.getDockerSocketPath()

    // Connect to Docker via socket
    this.docker = new Docker({
      socketPath,
    })
  }

  /**
   * Get the appropriate Docker socket path for the platform
   */
  private getDockerSocketPath(): string {
    // Check for Docker Desktop on macOS
    const fs = require('fs')
    const os = require('os')

    // Common Docker socket locations
    const socketPaths = [
      '/var/run/docker.sock', // Linux standard
      `${os.homedir()}/.docker/run/docker.sock`, // Docker Desktop on macOS
      '/var/run/docker.sock', // Docker in Docker
    ]

    for (const path of socketPaths) {
      if (fs.existsSync(path)) {
        return path
      }
    }

    // Fallback to standard location
    console.warn('[DockerAPI] Docker socket not found at common locations, using default')
    return '/var/run/docker.sock'
  }

  /**
   * Start collecting Docker metrics
   */
  async start() {
    if (this.isRunning) return

    this.isRunning = true

    try {
      // Initial load of containers and system info
      await this.loadSystemInfo()
      await this.loadContainers()

      // Start listening to Docker events
      this.startEventStream()

      // Start stats streaming for all running containers
      await this.startStatsStreaming()

      // Periodic system info refresh (every 10s)
      this.updateInterval = setInterval(() => {}, 10000)
    } catch (error) {
      this.isRunning = false
      throw error
    }
  }

  /**
   * Stop collecting Docker metrics
   */
  async stop() {
    if (!this.isRunning) return

    this.isRunning = false

    // Stop all stats streams
    for (const [_id, stream] of this.statsStreams) {
      try {
        stream.destroy()
      } catch (_error) {
        // Ignore errors when destroying streams - stream may already be closed
      }
    }
    this.statsStreams.clear()

    // Stop event stream
    if (this.eventStream) {
      this.eventStream.destroy()
      this.eventStream = null
    }

    // Clear update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  /**
   * Load system information
   */
  private async loadSystemInfo() {
    try {
      const [info, containers, images, volumes, networks] = await Promise.all([
        this.docker.info(),
        this.docker.listContainers({ all: true }),
        this.docker.listImages(),
        this.docker.listVolumes(),
        this.docker.listNetworks(),
      ])

      const containerCounts = {
        total: containers.length,
        running: containers.filter((c) => c.State === 'running').length,
        stopped: containers.filter((c) => c.State === 'exited').length,
        paused: containers.filter((c) => c.State === 'paused').length,
      }

      this.systemInfo = {
        containers: containerCounts,
        images: images.length,
        volumes: volumes.Volumes?.length || 0,
        networks: networks.length,
        cpus: info.NCPU || 0,
        memoryTotal: (info.MemTotal || 0) / (1024 * 1024 * 1024), // Convert to GB
        dockerVersion: info.ServerVersion || 'unknown',
        storageDriver: info.Driver || 'unknown',
      }

      this.emit('systemInfo', this.systemInfo)
    } catch (error) {
      console.warn('[DockerAPICollector] Error loading system info:', error)
    }
  }

  /**
   * Load all containers
   */
  private async loadContainers() {
    try {
      const containers = await this.docker.listContainers({ all: true })

      // Clear containers that no longer exist
      const currentIds = new Set(containers.map((c) => c.Id))
      for (const id of this.containers.keys()) {
        if (!currentIds.has(id)) {
          this.containers.delete(id)
          this.stopStatsStream(id)
        }
      }

      // Update container list
      for (const container of containers) {
        const stats: ContainerStats = {
          id: container.Id,
          name: container.Names[0]?.replace(/^\//, '') || container.Id.substring(0, 12),
          status: this.mapContainerState(container.State),
          health: this.mapHealthStatus(container.Status),
          cpu: 0,
          memory: { used: 0, limit: 0, percentage: 0 },
          network: { rx: 0, tx: 0 },
          blockIO: { read: 0, write: 0 },
          pids: 0,
          restartCount: 0,
          uptime: container.Status || '',
        }

        this.containers.set(container.Id, stats)

        // Start streaming stats if running
        if (container.State === 'running') {
          this.startStatsStreamForContainer(container.Id)
        }
      }

      const containerList = Array.from(this.containers.values())
      this.emit('containers', containerList)
    } catch (error) {
      console.warn('[DockerAPICollector] Error loading containers:', error)
    }
  }

  /**
   * Start Docker event stream
   */
  private async startEventStream() {
    try {
      this.eventStream = await this.docker.getEvents()

      let buffer = ''

      this.eventStream.on('data', (chunk: Buffer) => {
        // Docker events can come as multiple JSON objects in one chunk
        // We need to split them and parse each one
        buffer += chunk.toString()
        const lines = buffer.split('\n')

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || ''

        // Process complete lines
        for (const line of lines) {
          if (line.trim()) {
            try {
              const event = JSON.parse(line)
              this.handleDockerEvent(event)
            } catch {
              // Intentionally empty - skip malformed JSON lines from Docker event stream
            }
          }
        }
      })

      this.eventStream.on('error', (_error: Error) => {
        // Attempt to reconnect
        if (this.isRunning) {
          setTimeout(() => this.startEventStream(), 5000)
        }
      })
    } catch (error) {
      console.warn('[DockerAPICollector] Error starting event stream:', error)
    }
  }

  /**
   * Handle Docker event
   */
  private handleDockerEvent(event: any) {
    const { Type, Action, Actor } = event

    if (Type === 'container') {
      const containerId = Actor?.ID
      if (!containerId) return

      switch (Action) {
        case 'start':
          this.loadContainers() // Reload to get new container
          break
        case 'stop':
        case 'die':
          this.stopStatsStream(containerId)
          if (this.containers.has(containerId)) {
            const container = this.containers.get(containerId)!
            container.status = 'stopped'
            container.cpu = 0
            container.memory = { used: 0, limit: 0, percentage: 0 }
            this.emit('containerUpdate', container)
          }
          break
        case 'pause':
        case 'unpause':
        case 'restart':
          this.loadContainers() // Reload to update status
          break
        case 'health_status':
          // Update health status
          if (this.containers.has(containerId)) {
            const container = this.containers.get(containerId)!
            container.health = Actor?.Attributes?.health || 'none'
            this.emit('containerUpdate', container)
          }
          break
      }
    }

    // Emit raw event for any custom handling
    this.emit('dockerEvent', event)
  }

  /**
   * Start streaming stats for all running containers
   */
  private async startStatsStreaming() {
    const containers = await this.docker.listContainers({
      filters: { status: ['running'] },
    })

    for (const container of containers) {
      this.startStatsStreamForContainer(container.Id)
    }
  }

  /**
   * Start stats stream for a specific container
   */
  private async startStatsStreamForContainer(containerId: string) {
    // Skip if already streaming
    if (this.statsStreams.has(containerId)) {
      return
    }

    try {
      const container = this.docker.getContainer(containerId)
      const stream = await container.stats({ stream: true })

      this.statsStreams.set(containerId, stream)

      stream.on('data', (chunk: Buffer) => {
        try {
          const stats = JSON.parse(chunk.toString())
          this.processContainerStats(containerId, stats)
        } catch {
          // Intentionally empty - skip malformed JSON from stats stream
        }
      })

      stream.on('error', (_error: Error) => {
        this.stopStatsStream(containerId)
      })

      stream.on('end', () => {
        this.statsStreams.delete(containerId)
      })
    } catch (error) {
      console.warn(`[DockerAPICollector] Error starting stats stream for ${containerId}:`, error)
    }
  }

  /**
   * Stop stats stream for a container
   */
  private stopStatsStream(containerId: string) {
    const stream = this.statsStreams.get(containerId)
    if (stream) {
      try {
        stream.destroy()
      } catch {
        // Intentionally empty - ignore errors when destroying
      }
      this.statsStreams.delete(containerId)
    }
  }

  /**
   * Process container stats from stream
   */
  private processContainerStats(containerId: string, rawStats: any) {
    if (!this.containers.has(containerId)) {
      return
    }

    const container = this.containers.get(containerId)!

    // Calculate CPU percentage
    const cpuDelta =
      rawStats.cpu_stats.cpu_usage.total_usage - rawStats.precpu_stats.cpu_usage.total_usage
    const systemDelta = rawStats.cpu_stats.system_cpu_usage - rawStats.precpu_stats.system_cpu_usage
    const cpuCount = rawStats.cpu_stats.online_cpus || 1
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0

    // Calculate memory
    const memUsage = rawStats.memory_stats.usage || 0
    const memLimit = rawStats.memory_stats.limit || 0
    const memPercent = memLimit > 0 ? (memUsage / memLimit) * 100 : 0

    // Calculate network I/O (cumulative)
    let rx = 0,
      tx = 0
    if (rawStats.networks) {
      for (const net of Object.values(rawStats.networks) as any[]) {
        rx += net.rx_bytes || 0
        tx += net.tx_bytes || 0
      }
    }

    // Calculate block I/O
    let blockRead = 0,
      blockWrite = 0
    if (rawStats.blkio_stats?.io_service_bytes_recursive) {
      for (const io of rawStats.blkio_stats.io_service_bytes_recursive) {
        if (io.op === 'Read') blockRead += io.value
        if (io.op === 'Write') blockWrite += io.value
      }
    }

    // Update container stats
    container.cpu = Math.round(cpuPercent * 10) / 10
    container.memory = {
      used: memUsage / (1024 * 1024 * 1024), // Convert to GB
      limit: memLimit / (1024 * 1024 * 1024),
      percentage: Math.round(memPercent),
    }
    container.network = {
      rx: rx / (1024 * 1024), // Convert to MB
      tx: tx / (1024 * 1024),
    }
    container.blockIO = {
      read: blockRead / (1024 * 1024),
      write: blockWrite / (1024 * 1024),
    }
    container.pids = rawStats.pids_stats?.current || 0

    // Emit update
    this.emit('containerStats', container)
    this.emit('update', this.getSnapshot())
  }

  /**
   * Map Docker container state
   */
  private mapContainerState(state: string): ContainerStats['status'] {
    switch (state.toLowerCase()) {
      case 'running':
        return 'running'
      case 'exited':
        return 'stopped'
      case 'paused':
        return 'paused'
      case 'restarting':
        return 'restarting'
      case 'dead':
        return 'dead'
      default:
        return 'stopped'
    }
  }

  /**
   * Map health status from container status string
   */
  private mapHealthStatus(status: string): ContainerStats['health'] {
    if (status.includes('healthy')) return 'healthy'
    if (status.includes('unhealthy')) return 'unhealthy'
    if (status.includes('starting')) return 'starting'
    return 'none'
  }

  /**
   * Get current snapshot of all data
   */
  getSnapshot() {
    return {
      containers: Array.from(this.containers.values()),
      systemInfo: this.systemInfo,
      timestamp: Date.now(),
    }
  }

  /**
   * Get specific container stats
   */
  getContainer(id: string): ContainerStats | undefined {
    return this.containers.get(id)
  }

  /**
   * Get all containers
   */
  getContainers(): ContainerStats[] {
    return Array.from(this.containers.values())
  }

  /**
   * Get system info
   */
  getSystemInfo(): DockerSystemInfo | null {
    return this.systemInfo
  }
}

// Singleton instance
let collector: DockerAPICollector | null = null

export function getDockerAPICollector(): DockerAPICollector {
  if (!collector) {
    collector = new DockerAPICollector()
  }
  return collector
}
