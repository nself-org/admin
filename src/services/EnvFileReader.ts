/**
 * Environment File Reader
 * Reads and parses .env files for configuration
 */

import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'

export interface EnvConfig {
  // Database
  POSTGRES_DB?: string
  POSTGRES_USER?: string
  POSTGRES_PASSWORD?: string
  POSTGRES_HOST?: string
  POSTGRES_PORT?: string

  // Hasura
  HASURA_GRAPHQL_ENDPOINT?: string
  HASURA_GRAPHQL_ADMIN_SECRET?: string
  HASURA_GRAPHQL_DATABASE_URL?: string

  // Redis
  REDIS_HOST?: string
  REDIS_PORT?: string
  REDIS_PASSWORD?: string

  // MinIO
  MINIO_ROOT_USER?: string
  MINIO_ROOT_PASSWORD?: string
  MINIO_ENDPOINT?: string

  // Auth
  AUTH_URL?: string
  AUTH_CLIENT_ID?: string
  AUTH_CLIENT_SECRET?: string

  // Custom services
  [key: string]: string | undefined
}

export class EnvFileReader {
  private cache: Map<string, { data: EnvConfig; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 60000 // 1 minute cache

  /**
   * Read and parse an .env file
   */
  async read(filePath: string): Promise<EnvConfig> {
    const absolutePath = path.resolve(filePath)
    const now = Date.now()

    // Check cache
    const cached = this.cache.get(absolutePath)
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }

    try {
      if (!existsSync(absolutePath)) {
        console.warn(`[EnvFileReader] File not found: ${absolutePath}`)
        return {}
      }

      const content = await readFile(absolutePath, 'utf-8')
      const config = this.parse(content)

      // Update cache
      this.cache.set(absolutePath, { data: config, timestamp: now })

      return config
    } catch (_error) {
      return {}
    }
  }

  /**
   * Parse .env file content
   */
  private parse(content: string): EnvConfig {
    const config: EnvConfig = {}

    const lines = content.split('\n')
    for (const line of lines) {
      // Skip comments and empty lines
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      // Parse KEY=VALUE pairs
      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) continue

      const key = trimmed.substring(0, separatorIndex).trim()
      let value = trimmed.substring(separatorIndex + 1).trim()

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      // Handle escaped characters
      value = value
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')

      config[key] = value
    }

    return config
  }

  /**
   * Read multiple .env files and merge them
   */
  async readMultiple(filePaths: string[]): Promise<EnvConfig> {
    const configs = await Promise.all(filePaths.map((path) => this.read(path)))

    // Merge configs (later files override earlier ones)
    return configs.reduce(
      (merged, config) => ({
        ...merged,
        ...config,
      }),
      {}
    )
  }

  /**
   * Find and read .env files in a directory
   */
  async findAndRead(
    directory: string,
    patterns: string[] = ['.env', '.env.local', '.env.dev', '.env.staging', '.env.prod']
  ): Promise<EnvConfig> {
    const envFiles = patterns
      .map((pattern) => path.join(directory, pattern))
      .filter((filePath) => existsSync(filePath))

    if (envFiles.length === 0) {
      console.warn(`[EnvFileReader] No .env files found in ${directory}`)
      return {}
    }

    return this.readMultiple(envFiles)
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear()
  }
}

// Singleton instance
let reader: EnvFileReader | null = null

export function getEnvFileReader(): EnvFileReader {
  if (!reader) {
    reader = new EnvFileReader()
  }
  return reader
}
