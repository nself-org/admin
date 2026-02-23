/**
 * Docker Stats Collector
 * Efficient collection of Docker container statistics
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface DockerStats {
  cpu: number
  memory: {
    used: number // GB
    total: number // GB
    percentage: number
  }
  storage: {
    used: number // GB
    total: number // GB
    percentage: number
  }
  network: {
    rx: number // Mbps
    tx: number // Mbps
  }
  containers: {
    total: number
    running: number
    stopped: number
    healthy: number
    unhealthy: number
  }
}

export class DockerStatsCollector {
  private cache: {
    data: DockerStats | null
    timestamp: number
  } = { data: null, timestamp: 0 }

  private readonly CACHE_TTL = 1000 // 1 second cache

  /**
   * Get all Docker stats in a single efficient call
   */
  async collect(): Promise<DockerStats> {
    const now = Date.now()

    // Return cached if fresh
    if (this.cache.data && now - this.cache.timestamp < this.CACHE_TTL) {
      return this.cache.data
    }

    try {
      // Get all stats in parallel with timeout
      const [containers, stats, storage, network] = await Promise.all([
        this.getContainers(),
        this.getResourceStats(),
        this.getStorageStats(),
        this.getNetworkStats(),
      ])

      const result: DockerStats = {
        cpu: stats.cpu,
        memory: stats.memory,
        storage,
        network,
        containers,
      }

      // Update cache
      this.cache = { data: result, timestamp: now }

      return result
    } catch (_error) {
      // Return empty stats on error
      return {
        cpu: 0,
        memory: { used: 0, total: 8, percentage: 0 },
        storage: { used: 0, total: 50, percentage: 0 },
        network: { rx: 0, tx: 0 },
        containers: {
          total: 0,
          running: 0,
          stopped: 0,
          healthy: 0,
          unhealthy: 0,
        },
      }
    }
  }

  /**
   * Execute command with timeout using execFile (no shell injection)
   */
  private execWithTimeout(
    bin: string,
    args: string[],
    timeout: number,
    options: { maxBuffer?: number } = {},
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController()
      const timer = setTimeout(() => {
        controller.abort()
        reject(new Error(`Command timed out: ${bin} ${args.join(' ')}`))
      }, timeout)

      execFileAsync(bin, args, { signal: controller.signal, maxBuffer: options.maxBuffer })
        .then(({ stdout, stderr }) => {
          clearTimeout(timer)
          resolve({ stdout, stderr })
        })
        .catch((err) => {
          clearTimeout(timer)
          reject(err)
        })
    })
  }

  /**
   * Get container counts and health status
   */
  private async getContainers() {
    try {
      const { stdout: psOutput } = await this.execWithTimeout(
        'docker',
        ['ps', '-a', '--format', '{{.State}}|{{.Status}}'],
        2000,
      )

      const lines = psOutput
        .trim()
        .split('\n')
        .filter((l) => l)

      let running = 0,
        stopped = 0,
        healthy = 0,
        unhealthy = 0

      lines.forEach((line) => {
        const [state, status] = line.split('|')

        if (state === 'running') running++
        else stopped++

        if (status?.includes('healthy')) healthy++
        else if (status?.includes('unhealthy')) unhealthy++
      })

      return {
        total: lines.length,
        running,
        stopped,
        healthy,
        unhealthy,
      }
    } catch (_error) {
      return { total: 0, running: 0, stopped: 0, healthy: 0, unhealthy: 0 }
    }
  }

  /**
   * Parse a memory unit string like "3.5MiB" or "1.2GiB" into MiB
   */
  private parseToMiB(str: string): number {
    const match = str.trim().match(/^([0-9.]+)\s*([a-zA-Z]+)$/)
    if (!match) return 0
    const value = parseFloat(match[1])
    const unit = match[2].toLowerCase()
    if (unit.startsWith('g')) return value * 1024
    if (unit.startsWith('m')) return value
    if (unit.startsWith('k')) return value / 1024
    if (unit === 'b') return value / (1024 * 1024)
    return value
  }

  /**
   * Get CPU and Memory stats efficiently
   */
  private async getResourceStats() {
    try {
      // Get per-container stats as JSON lines for reliable parsing
      const { stdout } = await this.execWithTimeout(
        'docker',
        ['stats', '--no-stream', '--format', '{{json .}}'],
        8000,
        { maxBuffer: 5 * 1024 * 1024 },
      )

      const lines = stdout.trim().split('\n').filter((l) => l)
      let totalCpu = 0
      let totalMemUsedMiB = 0
      let memTotal = 8 // default GB

      for (const line of lines) {
        try {
          const data = JSON.parse(line)

          // CPU: "12.34%"
          const cpuMatch = (data.CPUPerc || '').replace('%', '')
          totalCpu += parseFloat(cpuMatch) || 0

          // Memory: "used / total"
          if (data.MemUsage && data.MemUsage !== '--') {
            const parts = data.MemUsage.split('/')
            if (parts.length === 2) {
              totalMemUsedMiB += this.parseToMiB(parts[0])
              // Use the last container's total as the system total (they all share the same host)
              const totalMiB = this.parseToMiB(parts[1])
              if (totalMiB > 0) memTotal = totalMiB / 1024
            }
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      const memUsed = totalMemUsedMiB / 1024 // Convert MiB to GiB

      return {
        cpu: Math.round(totalCpu * 10) / 10,
        memory: {
          used: Math.round(memUsed * 10) / 10,
          total: Math.round(memTotal * 10) / 10,
          percentage: Math.round((memUsed / memTotal) * 100),
        },
      }
    } catch (_error) {
      return {
        cpu: 0,
        memory: { used: 0, total: 8, percentage: 0 },
      }
    }
  }

  /**
   * Get storage stats from Docker system
   */
  private async getStorageStats() {
    try {
      const { stdout } = await this.execWithTimeout(
        'docker',
        ['system', 'df', '--format', '{{json .}}'],
        5000,
      )

      const lines = stdout
        .trim()
        .split('\n')
        .filter((l) => l)
      let totalSize = 0

      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          // Parse sizes (e.g., "4.687GB" -> 4.687)
          const parseSize = (str: string) => {
            if (!str) return 0
            const match = str.match(/([0-9.]+)([A-Z]+)/i)
            if (!match) return 0
            const value = parseFloat(match[1])
            const unit = match[2].toUpperCase()
            if (unit.startsWith('G')) return value
            if (unit.startsWith('M')) return value / 1024
            if (unit.startsWith('K')) return value / (1024 * 1024)
            return value
          }

          totalSize += parseSize(data.Size)
        } catch {
          // Intentionally empty - skip invalid JSON lines
        }
      }

      // Assume 50GB total available for Docker
      const totalAvailable = 50

      return {
        used: Math.round(totalSize * 10) / 10,
        total: totalAvailable,
        percentage: Math.round((totalSize / totalAvailable) * 100),
      }
    } catch (_error) {
      return { used: 0, total: 50, percentage: 0 }
    }
  }

  /**
   * Get network stats from all containers
   */
  private async getNetworkStats() {
    try {
      const { stdout } = await this.execWithTimeout(
        'docker',
        ['stats', '--no-stream', '--format', '{{json .}}'],
        8000,
        { maxBuffer: 5 * 1024 * 1024 },
      )

      const lines = stdout
        .trim()
        .split('\n')
        .filter((l) => l)
      let totalRx = 0
      let totalTx = 0

      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          // Parse network I/O (e.g., "858kB / 725kB")
          if (data.NetIO && data.NetIO !== '--') {
            const [rx, tx] = data.NetIO.split(' / ')

            const parseNetIO = (str: string) => {
              if (!str) return 0
              const match = str.match(/([0-9.]+)([A-Z]+)/i)
              if (!match) return 0
              const value = parseFloat(match[1])
              const unit = match[2].toUpperCase()
              // Convert to MB
              if (unit.startsWith('G')) return value * 1024
              if (unit.startsWith('M')) return value
              if (unit.startsWith('K')) return value / 1024
              if (unit === 'B') return value / (1024 * 1024)
              return value
            }

            totalRx += parseNetIO(rx)
            totalTx += parseNetIO(tx)
          }
        } catch {
          // Intentionally empty - skip invalid JSON lines
        }
      }

      // Convert to Mbps (rough estimate - this is cumulative, not rate)
      // For actual rate, we'd need to track over time
      return {
        rx: Math.round(totalRx * 10) / 10,
        tx: Math.round(totalTx * 10) / 10,
      }
    } catch (_error) {
      return { rx: 0, tx: 0 }
    }
  }
}

// Singleton instance
let collector: DockerStatsCollector | null = null

export function getDockerStatsCollector(): DockerStatsCollector {
  if (!collector) {
    collector = new DockerStatsCollector()
  }
  return collector
}
