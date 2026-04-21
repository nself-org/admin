/**
 * Plugin System Types for nself-admin v0.0.8
 */

export type PluginCategory =
  | 'billing'
  | 'ecommerce'
  | 'devops'
  | 'productivity'
  | 'communication'
  | 'finance'

export type PluginStatus =
  | 'installed'
  | 'available'
  | 'update_available'
  | 'installing'
  | 'error'

export interface Plugin {
  name: string
  version: string
  description: string
  category: PluginCategory
  status: PluginStatus
  installedVersion?: string
  latestVersion?: string
  minNselfVersion: string
  author: string
  repository?: string
  homepage?: string
  tables: string[]
  webhooks?: string[]
  envVars: {
    required: string[]
    optional: string[]
  }
  actions: Record<string, string>
  installedAt?: string
  lastSync?: string
  /** Declared permissions from plugin manifest (S71-T03). */
  permissions?: string[]
}

export interface PluginConfig {
  pluginName: string
  settings: Record<string, string | number | boolean>
  envVars: Record<string, string>
  webhookUrl?: string
  syncInterval?: number
  enabled: boolean
}

export interface MarketplacePlugin {
  name: string
  displayName?: string
  version: string
  description: string
  category: PluginCategory
  author: string
  downloads: number
  rating: number
  tags: string[]
  icon?: string
  screenshots?: string[]
  compatibility: {
    minVersion: string
    maxVersion?: string
  }
  tier?: 'free' | 'pro'
  bundle?: string | null
  bundleName?: string | null
  licenseRequired?: boolean
  price?: string | null
  related?: string[]
}

export interface PluginReview {
  user: string
  rating: number
  comment?: string
  createdAt: string
}

export interface PluginRatings {
  name: string
  rating: number
  reviewCount: number
  reviews: PluginReview[]
}

export interface PluginSyncStatus {
  pluginName: string
  lastSync: string
  nextSync?: string
  status: 'syncing' | 'idle' | 'error' | 'scheduled'
  recordsTotal: number
  recordsUpdated: number
  errors?: string[]
}

export interface WebhookEvent {
  id: string
  pluginName: string
  eventType: string
  payload: Record<string, unknown>
  status: 'received' | 'processed' | 'failed' | 'retrying'
  receivedAt: string
  processedAt?: string
  error?: string
  retryCount: number
}

export interface PluginTableInfo {
  tableName: string
  rowCount: number
  lastUpdated?: string
  size?: string
}
