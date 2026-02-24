/**
 * Hasura GraphQL Data Collector
 * Collects metrics and metadata from Hasura GraphQL Engine
 */

import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface HasuraStats {
  status: 'healthy' | 'unhealthy' | 'stopped'
  metadata: {
    tables: number
    relationships: number
    permissions: number
    actions: number
    eventTriggers: number
    cronTriggers: number
    remoteSchemas: number
  }
  performance: {
    activeSubscriptions: number
    queryRate: number
    avgResponseTime: number
  }
  health: {
    inconsistentObjects: any[]
    lastReload: string
    version: string
  }
}

export class HasuraCollector {
  private cache: {
    data: HasuraStats | null
    timestamp: number
  } = { data: null, timestamp: 0 }

  private readonly CACHE_TTL = 10000 // 10 seconds cache
  private readonly containerName = 'nself_hasura'
  private readonly adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET || ''

  /**
   * Collect all Hasura statistics
   */
  async collect(): Promise<HasuraStats> {
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
      const [metadata, health] = await Promise.all([
        this.getMetadataStats(),
        this.getHealthStatus(),
      ])

      const result: HasuraStats = {
        status: 'healthy',
        metadata,
        performance: {
          activeSubscriptions: 0, // Would need metrics endpoint
          queryRate: 0,
          avgResponseTime: 0,
        },
        health,
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
   * Check if Hasura container is running
   */
  private async checkContainerStatus(): Promise<boolean> {
    try {
      this.validateContainerName(this.containerName)
      const { stdout } = await this.execWithTimeout(
        'docker',
        [
          'ps',
          '--filter',
          `name=${this.containerName}`,
          '--format',
          '{{.Status}}',
        ],
        2000,
      )
      return stdout.trim().toLowerCase().includes('up')
    } catch {
      return false
    }
  }

  /**
   * Get metadata statistics from Hasura
   */
  private async getMetadataStats() {
    try {
      this.validateContainerName(this.containerName)
      const queryBody = JSON.stringify({
        type: 'export_metadata',
        version: 2,
        args: {},
      })

      const { stdout } = await this.execWithTimeout(
        'docker',
        [
          'exec',
          this.containerName,
          'curl',
          '-s',
          '-X',
          'POST',
          '-H',
          'Content-Type: application/json',
          '-H',
          `X-Hasura-Admin-Secret: ${this.adminSecret}`,
          '-d',
          queryBody,
          'http://localhost:8080/v1/metadata',
        ],
        10000,
        { maxBuffer: 10 * 1024 * 1024 },
      )

      const metadata = JSON.parse(stdout)

      // Count various metadata objects
      const tables = metadata.metadata?.sources?.[0]?.tables?.length || 0

      let relationships = 0
      let permissions = 0
      metadata.metadata?.sources?.[0]?.tables?.forEach((table: any) => {
        relationships +=
          (table.object_relationships?.length || 0) +
          (table.array_relationships?.length || 0)
        permissions +=
          (table.select_permissions?.length || 0) +
          (table.insert_permissions?.length || 0) +
          (table.update_permissions?.length || 0) +
          (table.delete_permissions?.length || 0)
      })

      const actions = metadata.metadata?.actions?.length || 0
      const eventTriggers =
        metadata.metadata?.sources?.[0]?.tables?.reduce(
          (acc: number, table: any) => {
            return acc + (table.event_triggers?.length || 0)
          },
          0,
        ) || 0
      const cronTriggers = metadata.metadata?.cron_triggers?.length || 0
      const remoteSchemas = metadata.metadata?.remote_schemas?.length || 0

      return {
        tables,
        relationships,
        permissions,
        actions,
        eventTriggers,
        cronTriggers,
        remoteSchemas,
      }
    } catch (_error) {
      return {
        tables: 0,
        relationships: 0,
        permissions: 0,
        actions: 0,
        eventTriggers: 0,
        cronTriggers: 0,
        remoteSchemas: 0,
      }
    }
  }

  /**
   * Get health status and inconsistent objects
   */
  private async getHealthStatus() {
    try {
      this.validateContainerName(this.containerName)
      const inconsistentBody = JSON.stringify({
        type: 'get_inconsistent_metadata',
        args: {},
      })

      const { stdout } = await this.execWithTimeout(
        'docker',
        [
          'exec',
          this.containerName,
          'curl',
          '-s',
          '-X',
          'POST',
          '-H',
          'Content-Type: application/json',
          '-H',
          `X-Hasura-Admin-Secret: ${this.adminSecret}`,
          '-d',
          inconsistentBody,
          'http://localhost:8080/v1/metadata',
        ],
        5000,
        { maxBuffer: 10 * 1024 * 1024 },
      )

      const response = JSON.parse(stdout)
      const inconsistentObjects = response.inconsistent_objects || []

      // Get version
      const { stdout: versionOut } = await this.execWithTimeout(
        'docker',
        [
          'exec',
          this.containerName,
          'curl',
          '-s',
          '-H',
          `X-Hasura-Admin-Secret: ${this.adminSecret}`,
          'http://localhost:8080/v1/version',
        ],
        5000,
      )

      let version = 'unknown'
      try {
        const versionData = JSON.parse(versionOut)
        version = versionData.version || 'unknown'
      } catch {
        // Ignore parse errors
      }

      return {
        inconsistentObjects,
        lastReload: new Date().toISOString(),
        version,
      }
    } catch (_error) {
      return {
        inconsistentObjects: [],
        lastReload: new Date().toISOString(),
        version: 'unknown',
      }
    }
  }

  /**
   * Get empty stats with status
   */
  private getEmptyStats(
    status: 'healthy' | 'unhealthy' | 'stopped',
  ): HasuraStats {
    return {
      status,
      metadata: {
        tables: 0,
        relationships: 0,
        permissions: 0,
        actions: 0,
        eventTriggers: 0,
        cronTriggers: 0,
        remoteSchemas: 0,
      },
      performance: {
        activeSubscriptions: 0,
        queryRate: 0,
        avgResponseTime: 0,
      },
      health: {
        inconsistentObjects: [],
        lastReload: new Date().toISOString(),
        version: 'unknown',
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
    options: { maxBuffer?: number } = {},
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController()
      const timer = setTimeout(() => {
        controller.abort()
        reject(new Error(`Command timed out: ${bin} ${args.join(' ')}`))
      }, timeout)

      execFileAsync(bin, args, {
        signal: controller.signal,
        maxBuffer: options.maxBuffer,
      })
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
let collector: HasuraCollector | null = null

export function getHasuraCollector(): HasuraCollector {
  if (!collector) {
    collector = new HasuraCollector()
  }
  return collector
}
