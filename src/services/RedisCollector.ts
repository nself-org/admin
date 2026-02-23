/**
 * Redis Data Collector
 * Collects metrics and statistics from Redis cache
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface RedisStats {
  status: 'healthy' | 'unhealthy' | 'stopped'
  memory: {
    used: string
    peak: string
    percentage: number
    evictedKeys: number
  }
  performance: {
    connectedClients: number
    opsPerSecond: number
    hitRate: number
    missRate: number
    totalCommands: number
  }
  persistence: {
    lastSave: string
    changesSinceSave: number
    aofEnabled: boolean
  }
  databases: {
    [key: string]: {
      keys: number
      expires: number
    }
  }
}

export class RedisCollector {
  private cache: {
    data: RedisStats | null
    timestamp: number
  } = { data: null, timestamp: 0 }

  private readonly CACHE_TTL = 5000 // 5 seconds cache
  private readonly containerName = 'nself_redis'

  /**
   * Collect all Redis statistics
   */
  async collect(): Promise<RedisStats> {
    const now = Date.now()

    // Return cached if fresh
    if (this.cache.data && now - this.cache.timestamp < this.CACHE_TTL) {
      return this.cache.data
    }

    try {
      // Check if container is running
      const isRunning = await this.checkContainerStatus()

      if (!isRunning) {
        return this.getEmptyStats('stopped')
      }

      // Get Redis INFO all at once
      const info = await this.getRedisInfo()

      const result: RedisStats = {
        status: 'healthy',
        memory: this.parseMemoryStats(info),
        performance: this.parsePerformanceStats(info),
        persistence: this.parsePersistenceStats(info),
        databases: this.parseDatabaseStats(info),
      }

      // Update cache
      this.cache = { data: result, timestamp: now }

      return result
    } catch (_error) {
      return this.getEmptyStats('unhealthy')
    }
  }

  /**
   * Validate container name to prevent injection
   */
  private validateContainerName(name: string): void {
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error('Invalid container name')
    }
  }

  /**
   * Check if Redis container is running
   */
  private async checkContainerStatus(): Promise<boolean> {
    try {
      this.validateContainerName(this.containerName)
      const { stdout } = await this.execWithTimeout(
        'docker',
        ['ps', '--filter', `name=${this.containerName}`, '--format', '{{.Status}}'],
        2000,
      )
      return stdout.trim().toLowerCase().includes('up')
    } catch {
      return false
    }
  }

  /**
   * Get Redis INFO output
   */
  private async getRedisInfo(): Promise<string> {
    this.validateContainerName(this.containerName)
    const { stdout } = await this.execWithTimeout(
      'docker',
      ['exec', this.containerName, 'redis-cli', 'INFO'],
      5000,
    )
    return stdout
  }

  /**
   * Parse memory statistics from INFO output
   */
  private parseMemoryStats(info: string): RedisStats['memory'] {
    const lines = info.split('\n')
    const stats: any = {}

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':').map((s) => s.trim())
        stats[key] = value
      }
    }

    // Convert bytes to human readable
    const formatBytes = (bytes: number) => {
      if (bytes < 1024) return `${bytes}B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`
      if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`
    }

    const usedMemory = parseInt(stats.used_memory || '0')
    const peakMemory = parseInt(stats.used_memory_peak || '0')
    const maxMemory = parseInt(stats.maxmemory || '0') || 1024 * 1024 * 1024 // Default 1GB

    return {
      used: formatBytes(usedMemory),
      peak: formatBytes(peakMemory),
      percentage: Math.round((usedMemory / maxMemory) * 100),
      evictedKeys: parseInt(stats.evicted_keys || '0'),
    }
  }

  /**
   * Parse performance statistics from INFO output
   */
  private parsePerformanceStats(info: string): RedisStats['performance'] {
    const lines = info.split('\n')
    const stats: any = {}

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':').map((s) => s.trim())
        stats[key] = value
      }
    }

    const keyspaceHits = parseInt(stats.keyspace_hits || '0')
    const keyspaceMisses = parseInt(stats.keyspace_misses || '0')
    const totalLookups = keyspaceHits + keyspaceMisses

    return {
      connectedClients: parseInt(stats.connected_clients || '0'),
      opsPerSecond: parseInt(stats.instantaneous_ops_per_sec || '0'),
      hitRate:
        totalLookups > 0 ? Math.round((keyspaceHits / totalLookups) * 100) : 0,
      missRate:
        totalLookups > 0
          ? Math.round((keyspaceMisses / totalLookups) * 100)
          : 0,
      totalCommands: parseInt(stats.total_commands_processed || '0'),
    }
  }

  /**
   * Parse persistence statistics from INFO output
   */
  private parsePersistenceStats(info: string): RedisStats['persistence'] {
    const lines = info.split('\n')
    const stats: any = {}

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':').map((s) => s.trim())
        stats[key] = value
      }
    }

    const lastSaveTime = parseInt(stats.rdb_last_save_time || '0')
    const lastSave =
      lastSaveTime > 0 ? new Date(lastSaveTime * 1000).toISOString() : 'Never'

    return {
      lastSave,
      changesSinceSave: parseInt(stats.rdb_changes_since_last_save || '0'),
      aofEnabled: stats.aof_enabled === '1',
    }
  }

  /**
   * Parse database statistics from INFO output
   */
  private parseDatabaseStats(info: string): RedisStats['databases'] {
    const lines = info.split('\n')
    const databases: RedisStats['databases'] = {}

    for (const line of lines) {
      // Look for db0, db1, etc.
      const dbMatch = line.match(/^db(\d+):keys=(\d+),expires=(\d+)/)
      if (dbMatch) {
        const [, dbNum, keys, expires] = dbMatch
        databases[`db${dbNum}`] = {
          keys: parseInt(keys),
          expires: parseInt(expires),
        }
      }
    }

    // If no databases found, add default db0
    if (Object.keys(databases).length === 0) {
      databases.db0 = { keys: 0, expires: 0 }
    }

    return databases
  }

  /**
   * Get empty stats with status
   */
  private getEmptyStats(
    status: 'healthy' | 'unhealthy' | 'stopped',
  ): RedisStats {
    return {
      status,
      memory: {
        used: '0B',
        peak: '0B',
        percentage: 0,
        evictedKeys: 0,
      },
      performance: {
        connectedClients: 0,
        opsPerSecond: 0,
        hitRate: 0,
        missRate: 0,
        totalCommands: 0,
      },
      persistence: {
        lastSave: 'Never',
        changesSinceSave: 0,
        aofEnabled: false,
      },
      databases: {
        db0: { keys: 0, expires: 0 },
      },
    }
  }

  /**
   * Execute command with timeout using execFile (no shell injection)
   */
  private execWithTimeout(
    bin: string,
    args: string[],
    timeout: number,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController()
      const timer = setTimeout(() => {
        controller.abort()
        reject(new Error(`Command timed out: ${bin} ${args.join(' ')}`))
      }, timeout)

      execFileAsync(bin, args, { signal: controller.signal })
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
}

// Singleton instance
let collector: RedisCollector | null = null

export function getRedisCollector(): RedisCollector {
  if (!collector) {
    collector = new RedisCollector()
  }
  return collector
}
