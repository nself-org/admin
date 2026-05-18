// API Key types for v0.7.0

export type ApiKeyStatus = 'active' | 'inactive' | 'expired' | 'revoked'
export type ApiKeyScope = 'read' | 'write' | 'admin' | 'custom'

export interface ApiKeyPermission {
  resource: string
  actions: ('create' | 'read' | 'update' | 'delete' | 'execute')[]
}

export interface ApiKey {
  id: string
  tenantId?: string
  name: string
  description?: string
  keyPrefix: string // First 8 chars for identification
  keyHash: string // bcrypt hash
  status: ApiKeyStatus
  scope: ApiKeyScope
  permissions?: ApiKeyPermission[]
  rateLimit?: {
    requests: number
    window: number // seconds
  }
  allowedIps?: string[]
  allowedOrigins?: string[]
  expiresAt?: string
  lastUsedAt?: string
  lastUsedIp?: string
  usageCount: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ApiKeyUsage {
  id: string
  keyId: string
  endpoint: string
  method: string
  statusCode: number
  responseTime: number // ms
  ipAddress: string
  userAgent?: string
  requestSize?: number
  responseSize?: number
  timestamp: string
}

export interface ApiKeyUsageStats {
  keyId: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  requestsByEndpoint: Record<string, number>
  requestsByStatus: Record<number, number>
  requestsByHour: { hour: string; count: number }[]
  topEndpoints: { endpoint: string; count: number; avgTime: number }[]
  errorRate: number
}

export interface ApiKeyRateLimit {
  keyId: string
  currentRequests: number
  limit: number
  window: number
  resetAt: string
  isLimited: boolean
}

export interface CreateApiKeyInput {
  name: string
  description?: string
  scope: ApiKeyScope
  permissions?: ApiKeyPermission[]
  rateLimit?: {
    requests: number
    window: number
  }
  allowedIps?: string[]
  allowedOrigins?: string[]
  expiresAt?: string
}

export interface CreateApiKeyResult {
  key: ApiKey
  secretKey: string // Only returned once on creation
}

export interface ApiKeyLog {
  id: string
  keyId: string
  action: 'created' | 'updated' | 'activated' | 'deactivated' | 'revoked' | 'used' | 'rate_limited'
  details?: Record<string, unknown>
  ipAddress?: string
  timestamp: string
}

export interface ApiKeyStats {
  totalKeys: number
  activeKeys: number
  expiredKeys: number
  revokedKeys: number
  byScope: Record<ApiKeyScope, number>
  totalRequests24h: number
  topKeys: { key: ApiKey; requests: number }[]
}
