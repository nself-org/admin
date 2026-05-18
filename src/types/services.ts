/**
 * Service Management Types for nself-admin v0.0.8
 */

export type ServiceCategory = 'required' | 'optional' | 'monitoring' | 'custom' | 'plugin'

export type ServiceStatus =
  | 'running'
  | 'stopped'
  | 'starting'
  | 'stopping'
  | 'error'
  | 'unhealthy'
  | 'unknown'

export interface Service {
  name: string
  displayName: string
  category: ServiceCategory
  status: ServiceStatus
  healthy: boolean
  containerName?: string
  containerId?: string
  image: string
  ports: { host: number; container: number; protocol: string }[]
  uptime?: string
  restarts?: number
  cpu?: number
  memory?: {
    used: number
    limit: number
    percentage: number
  }
  network?: {
    rx: number
    tx: number
  }
  createdAt?: string
  healthCheck?: {
    status: 'healthy' | 'unhealthy' | 'starting'
    lastCheck: string
    failureCount: number
  }
}

export interface ServiceDetail extends Service {
  description: string
  version?: string
  environment: Record<string, string>
  volumes: { host: string; container: string; mode: string }[]
  networks: string[]
  labels: Record<string, string>
  dependencies: string[]
  healthNote?: string
  documentationUrl?: string
  consoleUrl?: string
  logsAvailable: boolean
  execAvailable: boolean
}

export interface ServiceLogs {
  serviceName: string
  logs: LogEntry[]
  hasMore: boolean
  cursor?: string
}

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  stream: 'stdout' | 'stderr'
}

export interface ServiceAction {
  action: 'start' | 'stop' | 'restart' | 'remove'
  serviceName: string
  status: 'pending' | 'in_progress' | 'success' | 'failed'
  startedAt: string
  completedAt?: string
  error?: string
}

export interface OptionalService {
  name: string
  displayName: string
  description: string
  enabled: boolean
  installed: boolean
  category: 'storage' | 'cache' | 'search' | 'email' | 'functions' | 'ml' | 'monitoring'
  envVar: string
  ports: { port: number; description: string }[]
  requiredEnvVars?: string[]
  consoleUrl?: string
  documentationUrl?: string
}

// Service-specific types
export interface RedisInfo {
  version: string
  mode: string
  connectedClients: number
  usedMemory: string
  usedMemoryPeak: string
  totalKeys: number
  hitRate: number
  uptimeSeconds: number
  commandsProcessed: number
}

export interface MinioInfo {
  version: string
  mode: string
  buckets: {
    name: string
    objects: number
    size: string
    createdAt: string
  }[]
  totalSize: string
  totalObjects: number
}

export interface HasuraInfo {
  version: string
  metadataStatus: 'consistent' | 'inconsistent'
  trackedTables: number
  relationships: number
  permissions: number
  actions: number
  eventTriggers: number
  remoteSchemasCount: number
  consoleUrl: string
}

export interface PostgresInfo {
  version: string
  database: string
  size: string
  tables: number
  indexes: number
  connections: {
    active: number
    idle: number
    max: number
  }
  uptime: string
  replicationStatus?: string
}

export interface EmailInfo {
  provider: 'mailpit' | 'smtp'
  status: 'connected' | 'disconnected' | 'error'
  inbox?: {
    total: number
    unread: number
  }
  consoleUrl?: string
}

export interface SearchInfo {
  provider: 'meilisearch'
  version: string
  status: 'healthy' | 'unhealthy'
  indexes: {
    name: string
    documents: number
    size: string
    lastUpdate: string
  }[]
  totalDocuments: number
}

export interface FunctionsInfo {
  runtime: string
  status: 'running' | 'stopped' | 'error'
  functions: {
    name: string
    status: 'deployed' | 'pending' | 'error'
    invocations?: number
    lastInvoked?: string
  }[]
  totalFunctions: number
}

export interface MLflowInfo {
  version: string
  status: 'running' | 'stopped'
  experiments: number
  runs: number
  models: number
  artifactStore: string
  consoleUrl: string
}
