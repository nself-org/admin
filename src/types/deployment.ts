/**
 * Deployment & Environment Types for nself-admin v0.0.8
 */

// ── Control-Plane Types (reality-derived from `nself env target *`) ────────────

/**
 * Capability level for a server — computed by CLI probe, NEVER by the UI.
 * manage   = SSH ok + key present + docker reachable
 * read-only = host resolves but no working SSH
 * hidden   = no key ref / host unset / unreachable
 */
export type ServerCapability = 'manage' | 'read-only' | 'hidden'

/**
 * One server entry from `nself env target list --json`.
 * sshKeyRef is the KEY NAME only — raw SSH key bytes are NEVER stored or displayed.
 */
export interface ControlPlaneServer {
  name: string
  host: string
  role: string
  capability: ServerCapability
  /** Resolver explanation strings, e.g. "SSH key missing", "Docker unreachable" */
  reason?: string[]
  primary?: boolean
  /** Key reference name only — not the key material */
  sshKeyRef?: string
  remotePath?: string
  upstreams?: string[]
}

/** One environment entry from CLI inventory */
export interface ControlPlaneEnvironment {
  name: string
  kind: string
  servers: ControlPlaneServer[]
}

/** Full inventory response from `nself env target list --json` */
export interface ControlPlaneInventory {
  environments: ControlPlaneEnvironment[]
  probed?: boolean
  timestamp?: string
}

// ── Legacy static union (kept for backward compat in other pages) ──────────────

export type Environment = 'local' | 'development' | 'staging' | 'production'

export type DeploymentStrategy = 'standard' | 'rolling' | 'canary' | 'blue-green'

export interface EnvironmentInfo {
  name: Environment
  status: 'active' | 'inactive' | 'deploying' | 'error'
  url?: string
  version?: string
  lastDeployed?: string
  deployedBy?: string
  commit?: string
  branch?: string
  healthy?: boolean
  servicesRunning?: number
  servicesTotal?: number
}

export interface EnvironmentConfig {
  name: Environment
  variables: Record<string, string>
  secrets: Record<string, boolean> // true = set, value masked
  serverHost?: string
  serverUser?: string
  sshKeyPath?: string
  domain?: string
}

export interface EnvironmentDiffEntry {
  key: string
  local?: string
  staging?: string
  production?: string
  status: 'same' | 'different' | 'missing_local' | 'missing_staging' | 'missing_production'
  isSecret: boolean
}

export interface EnvironmentDiff {
  source: Environment
  target: Environment
  variables: {
    added: string[]
    removed: string[]
    changed: Array<{ key: string; sourceValue: string; targetValue: string }>
  }
  secrets: {
    added: string[]
    removed: string[]
    changed: string[]
  }
  services: {
    added: string[]
    removed: string[]
    changed: Array<{
      name: string
      sourceVersion: string
      targetVersion: string
    }>
  }
}

export interface Deployment {
  id: string
  environment: Environment
  strategy: DeploymentStrategy
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back' | 'rolling_back'
  version: string
  commit: string
  branch: string
  startedAt: string
  completedAt?: string
  duration?: number
  deployedBy: string
  changes?: string[]
  logs?: string
  rollbackAvailable: boolean
  error?: string
}

export interface DeploymentHistory {
  deployments: Deployment[]
  total: number
  page: number
  pageSize: number
}

export interface PreviewEnvironment {
  id: string
  name: string
  branch: string
  commit: string
  url: string
  status: 'creating' | 'active' | 'destroying' | 'error'
  createdAt: string
  expiresAt?: string
  createdBy: string
  services: { name: string; status: string; url?: string }[]
}

export interface CanaryDeployment {
  id: string
  environment: Environment
  status: 'in_progress' | 'promoted' | 'rolled_back'
  trafficPercentage: number
  newVersion: string
  currentVersion: string
  startedAt: string
  metrics?: {
    errorRate: { new: number; current: number }
    latency: { new: number; current: number }
    successRate: { new: number; current: number }
  }
}

export interface BlueGreenDeployment {
  id: string
  environment: Environment
  activeColor: 'blue' | 'green'
  blueVersion: string
  greenVersion: string
  blueStatus: 'active' | 'standby' | 'deploying'
  greenStatus: 'active' | 'standby' | 'deploying'
  lastSwitch?: string
  canRollback: boolean
}

export interface RollbackInfo {
  deploymentId: string
  currentVersion: string
  targetVersion: string
  changes: string[]
  estimatedDowntime: string
  requiresConfirmation: boolean
}

export interface SyncOperation {
  id: string
  type?: 'database' | 'files' | 'config' | 'full'
  source: Environment
  target: Environment
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
  itemsTotal?: number
  itemsSynced?: number
  errors?: string[]
  error?: string
  changes?: {
    variables: number
    secrets: number
    services: number
  }
  syncedBy?: string
}

export interface SyncHistory {
  operations: SyncOperation[]
  total: number
}

export interface HistoryEntry {
  id: string
  type:
    | 'deployment'
    | 'migration'
    | 'rollback'
    | 'command'
    | 'sync'
    | 'backup'
    | 'restore'
    | 'config_change'
    | 'database'
    | 'service'
    | 'security'
  action: string
  environment?: Environment
  status?: 'success' | 'failed' | 'in_progress'
  startedAt?: string
  completedAt?: string
  duration?: number
  user?: string
  details?: Record<string, unknown>
  description?: string
  timestamp?: string
  metadata?: Record<string, unknown>
}

export interface FrontendApp {
  id: string
  name: string
  framework?: string
  buildCommand?: string
  outputDir?: string
  envVars?: Record<string, string>
  domain?: string
  status: 'active' | 'deploying' | 'failed' | 'stopped' | 'running' | 'building'
  lastDeployed?: string
  url?: string
  branch?: string
  buildTime?: number
  metrics?: {
    requests: number
    latency: number
    errors: number
  }
}
