/**
 * PostgreSQL Data Collector
 * Collects metrics and statistics from PostgreSQL database
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface PostgresStats {
  status: 'healthy' | 'unhealthy' | 'stopped'
  connections: {
    active: number
    idle: number
    max: number
    percentage: number
  }
  databases: {
    count: number
    totalSize: string
    list: DatabaseInfo[]
  }
  performance: {
    activeQueries: number
    slowQueries: number
    cacheHitRatio: number
    transactionsPerSecond: number
  }
  replication?: {
    isReplica: boolean
    lag: number
  }
}

interface DatabaseInfo {
  name: string
  size: string
  tableCount: number
  connections: number
}

export class PostgresCollector {
  private cache: {
    data: PostgresStats | null
    timestamp: number
  } = { data: null, timestamp: 0 }

  private readonly CACHE_TTL = 5000 // 5 seconds cache
  private readonly containerName = 'nself_postgres' // Default container name

  /**
   * Collect all PostgreSQL statistics
   */
  async collect(): Promise<PostgresStats> {
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

      // Collect all stats in parallel
      const [connections, databases, performance] = await Promise.all([
        this.getConnectionStats(),
        this.getDatabaseStats(),
        this.getPerformanceStats(),
      ])

      const result: PostgresStats = {
        status: 'healthy',
        connections,
        databases,
        performance,
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
   * Check if PostgreSQL container is running
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
   * Get connection statistics
   */
  private async getConnectionStats() {
    try {
      this.validateContainerName(this.containerName)
      // Query pg_stat_database for connection info
      const query = `
        SELECT 
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle,
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max
      `

      const { stdout } = await this.execWithTimeout(
        'docker',
        ['exec', this.containerName, 'psql', '-U', 'postgres', '-d', 'nself', '-t', '-c', query],
        5000,
      )

      // Parse output (format: "active | idle | max")
      const [active, idle, max] = stdout
        .trim()
        .split('|')
        .map((s) => parseInt(s.trim()) || 0)
      const total = active + idle

      return {
        active,
        idle,
        max,
        percentage: Math.round((total / max) * 100),
      }
    } catch (_error) {
      return { active: 0, idle: 0, max: 100, percentage: 0 }
    }
  }

  /**
   * Get database statistics
   */
  private async getDatabaseStats() {
    try {
      this.validateContainerName(this.containerName)
      // Query for database sizes and stats
      const query = `
        SELECT 
          datname,
          pg_size_pretty(pg_database_size(datname)) as size,
          (SELECT count(*) FROM pg_stat_user_tables) as tables
        FROM pg_database 
        WHERE datname NOT IN ('template0', 'template1', 'postgres')
        ORDER BY pg_database_size(datname) DESC
      `

      const { stdout } = await this.execWithTimeout(
        'docker',
        ['exec', this.containerName, 'psql', '-U', 'postgres', '-t', '-c', query],
        5000,
      )

      const lines = stdout
        .trim()
        .split('\n')
        .filter((l) => l.trim())
      const databases: DatabaseInfo[] = []

      for (const line of lines) {
        const parts = line.split('|').map((s) => s.trim())
        if (parts.length >= 3) {
          const [name, size, tableCount] = parts
          databases.push({
            name,
            size,
            tableCount: parseInt(tableCount) || 0,
            connections: 0, // Would need separate query per DB
          })
        }
      }

      // Get total database size
      const totalQuery = `SELECT pg_size_pretty(sum(pg_database_size(datname))) FROM pg_database`
      const { stdout: totalOut } = await this.execWithTimeout(
        'docker',
        ['exec', this.containerName, 'psql', '-U', 'postgres', '-t', '-c', totalQuery],
        5000,
      )

      return {
        count: databases.length,
        totalSize: totalOut.trim() || '0 MB',
        list: databases,
      }
    } catch (_error) {
      return { count: 0, totalSize: '0 MB', list: [] }
    }
  }

  /**
   * Get performance statistics
   */
  private async getPerformanceStats() {
    try {
      this.validateContainerName(this.containerName)
      // Query for performance metrics
      const query = `
        SELECT 
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%') as active_queries,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND extract(epoch from now() - query_start) > 5) as slow_queries,
          (SELECT ROUND(100.0 * sum(blks_hit) / NULLIF(sum(blks_hit + blks_read), 0), 2) FROM pg_stat_database) as cache_hit_ratio,
          (SELECT ROUND(sum(xact_commit + xact_rollback) / NULLIF(EXTRACT(epoch FROM now() - stats_reset), 0), 2) FROM pg_stat_database WHERE stats_reset IS NOT NULL) as tps
      `

      const { stdout } = await this.execWithTimeout(
        'docker',
        ['exec', this.containerName, 'psql', '-U', 'postgres', '-d', 'nself', '-t', '-c', query],
        5000,
      )

      // Parse output
      const [activeQueries, slowQueries, cacheHitRatio, tps] = stdout
        .trim()
        .split('|')
        .map((s) => parseFloat(s.trim()) || 0)

      return {
        activeQueries: Math.round(activeQueries),
        slowQueries: Math.round(slowQueries),
        cacheHitRatio: Math.round(cacheHitRatio * 10) / 10,
        transactionsPerSecond: Math.round(tps * 10) / 10,
      }
    } catch (_error) {
      return {
        activeQueries: 0,
        slowQueries: 0,
        cacheHitRatio: 0,
        transactionsPerSecond: 0,
      }
    }
  }

  /**
   * Get empty stats with status
   */
  private getEmptyStats(
    status: 'healthy' | 'unhealthy' | 'stopped',
  ): PostgresStats {
    return {
      status,
      connections: { active: 0, idle: 0, max: 100, percentage: 0 },
      databases: { count: 0, totalSize: '0 MB', list: [] },
      performance: {
        activeQueries: 0,
        slowQueries: 0,
        cacheHitRatio: 0,
        transactionsPerSecond: 0,
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
let collector: PostgresCollector | null = null

export function getPostgresCollector(): PostgresCollector {
  if (!collector) {
    collector = new PostgresCollector()
  }
  return collector
}
