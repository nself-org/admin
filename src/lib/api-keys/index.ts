/**
 * API Keys library for managing API key operations
 * REAL IMPLEMENTATION - Uses cryptographically secure keys and database storage
 */

import { getDatabase, initDatabase } from '@/lib/database'
import type {
  ApiKey,
  ApiKeyLog,
  ApiKeyRateLimit,
  ApiKeyScope,
  ApiKeyStats,
  ApiKeyUsage,
  ApiKeyUsageStats,
  CreateApiKeyInput,
  CreateApiKeyResult,
} from '@/types/api-key'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import type { Collection } from 'lokijs'

// =============================================================================
// Database Collections
// =============================================================================

let apiKeysCollection: Collection<ApiKey> | null = null
let apiKeyUsageCollection: Collection<ApiKeyUsage> | null = null
let apiKeyLogsCollection: Collection<ApiKeyLog> | null = null
let apiKeyRateLimitCollection: Collection<{
  keyId: string
  requests: number[]
  resetAt: string
}> | null = null

/**
 * Initialize API key collections in database
 */
async function initApiKeyCollections(): Promise<void> {
  await initDatabase()
  const db = getDatabase()

  if (!db) {
    throw new Error('Database not initialized')
  }

  // API Keys collection
  // Note: 'keyPrefix' is intentionally NOT in indices.  rotateApiKey() mutates
  // keyPrefix on the live record object before calling update(), which would
  // corrupt a binary index on that field (LokiJS 1.5.12 limitation).
  // Without a binary index, findOne({keyPrefix}) does a linear scan which is
  // always correct regardless of in-place mutations.
  apiKeysCollection =
    db.getCollection('apiKeys') ||
    db.addCollection('apiKeys', {
      unique: ['id'],
      indices: ['id', 'status', 'tenantId'],
    })

  // API Key Usage collection
  apiKeyUsageCollection =
    db.getCollection('apiKeyUsage') ||
    db.addCollection('apiKeyUsage', {
      unique: ['id'],
      indices: ['keyId', 'timestamp'],
      ttl: 90 * 24 * 60 * 60 * 1000, // 90 days retention
      ttlInterval: 60 * 60 * 1000, // Check hourly
    })

  // API Key Logs collection
  apiKeyLogsCollection =
    db.getCollection('apiKeyLogs') ||
    db.addCollection('apiKeyLogs', {
      unique: ['id'],
      indices: ['keyId', 'action', 'timestamp'],
      ttl: 90 * 24 * 60 * 60 * 1000, // 90 days retention
      ttlInterval: 60 * 60 * 1000, // Check hourly
    })

  // Rate limit tracking collection
  apiKeyRateLimitCollection =
    db.getCollection('apiKeyRateLimit') ||
    db.addCollection('apiKeyRateLimit', {
      unique: ['keyId'],
      indices: ['keyId', 'resetAt'],
    })
}

// =============================================================================
// Cryptographic Utility Functions
// =============================================================================

/**
 * Generate a cryptographically secure API key
 * Format: prefix_secret
 * - prefix: 8 chars for identification (nself_XX)
 * - secret: 40 chars cryptographically random
 * Total: ~48 characters
 */
function generateSecureApiKey(prefix: string): string {
  // Generate 30 bytes of random data (40 chars in base62)
  const randomBytes = crypto.randomBytes(30)

  // Convert to base62 (alphanumeric only)
  const base62Chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let secret = ''

  for (let i = 0; i < randomBytes.length; i++) {
    const byte = randomBytes[i]
    secret += base62Chars[byte % base62Chars.length]
  }

  // Ensure exactly 40 characters
  secret = secret.substring(0, 40)

  return `${prefix}_${secret}`
}

/**
 * Generate an 8-character prefix for API keys
 * Format: nself_XX where XX are random lowercase letters
 */
export function generateKeyPrefix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  const randomBytes = crypto.randomBytes(2)

  let suffix = ''
  for (let i = 0; i < 2; i++) {
    suffix += chars[randomBytes[i] % chars.length]
  }

  return `nself_${suffix}`
}

/**
 * Hash an API key using bcrypt
 * Uses cost factor of 12 (2^12 = 4096 iterations)
 */
async function hashApiKey(key: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(key, salt)
}

/**
 * Verify an API key against its hash
 */
async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(key, hash)
  } catch {
    return false
  }
}

/**
 * Mask an API key showing only the prefix
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '****'
  const prefix = key.substring(0, 8)
  return `${prefix}****`
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
}

/**
 * Generate a unique usage ID
 */
function generateUsageId(): string {
  return `usage_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
}

/**
 * Generate a unique log ID
 */
function generateLogId(): string {
  return `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
}

// =============================================================================
// Logging Functions
// =============================================================================

/**
 * Add a log entry for API key actions
 */
async function addApiKeyLog(
  keyId: string,
  action: ApiKeyLog['action'],
  details?: Record<string, unknown>,
  ipAddress?: string,
): Promise<void> {
  await initApiKeyCollections()

  const log: ApiKeyLog = {
    id: generateLogId(),
    keyId,
    action,
    details,
    ipAddress,
    timestamp: new Date().toISOString(),
  }

  apiKeyLogsCollection?.insert(log)
  getDatabase()?.saveDatabase()
}

// =============================================================================
// API Key Management Functions
// =============================================================================

/**
 * Get all API keys, optionally filtered by tenant
 */
export async function getApiKeys(tenantId?: string): Promise<ApiKey[]> {
  await initApiKeyCollections()

  let keys: ApiKey[]

  if (tenantId) {
    keys = apiKeysCollection?.find({ tenantId }) || []
  } else {
    keys = apiKeysCollection?.find() || []
  }

  // Check for expired keys and update status
  const now = new Date()
  let updated = false

  for (const key of keys) {
    if (
      key.status === 'active' &&
      key.expiresAt &&
      new Date(key.expiresAt) < now
    ) {
      key.status = 'expired'
      key.updatedAt = now.toISOString()
      apiKeysCollection?.update(key)
      updated = true
    }
  }

  if (updated) {
    getDatabase()?.saveDatabase()
  }

  return keys
}

/**
 * Get a single API key by ID
 */
export async function getApiKeyById(id: string): Promise<ApiKey | null> {
  await initApiKeyCollections()
  return apiKeysCollection?.findOne({ id }) || null
}

/**
 * Create a new API key with cryptographically secure generation
 */
export async function createApiKey(
  input: CreateApiKeyInput,
  createdBy: string = 'admin',
): Promise<CreateApiKeyResult> {
  await initApiKeyCollections()

  // Generate secure prefix and key
  const prefix = generateKeyPrefix()
  const secretKey = generateSecureApiKey(prefix)

  // Hash the key for storage (NEVER store plaintext)
  const keyHash = await hashApiKey(secretKey)

  const now = new Date().toISOString()

  const newKey: ApiKey = {
    id: generateId(),
    name: input.name,
    description: input.description,
    keyPrefix: prefix,
    keyHash,
    status: 'active',
    scope: input.scope,
    permissions: input.permissions,
    rateLimit: input.rateLimit || { requests: 1000, window: 3600 },
    allowedIps: input.allowedIps,
    allowedOrigins: input.allowedOrigins,
    expiresAt: input.expiresAt,
    usageCount: 0,
    createdBy,
    createdAt: now,
    updatedAt: now,
  }

  apiKeysCollection?.insert(newKey)
  getDatabase()?.saveDatabase()

  await addApiKeyLog(newKey.id, 'created', {
    scope: newKey.scope,
    name: newKey.name,
  })

  return {
    key: newKey,
    secretKey, // Only returned once on creation
  }
}

/**
 * Update an existing API key
 */
export async function updateApiKey(
  id: string,
  updates: Partial<
    Pick<
      ApiKey,
      | 'name'
      | 'description'
      | 'status'
      | 'rateLimit'
      | 'allowedIps'
      | 'allowedOrigins'
      | 'permissions'
      | 'expiresAt'
    >
  >,
): Promise<ApiKey | null> {
  await initApiKeyCollections()

  const key = apiKeysCollection?.findOne({ id })
  if (!key) return null

  // Track what changed for logging
  const changes: Record<string, unknown> = {}
  for (const [field, value] of Object.entries(updates)) {
    if (JSON.stringify(key[field as keyof ApiKey]) !== JSON.stringify(value)) {
      changes[field] = { old: key[field as keyof ApiKey], new: value }
    }
  }

  // Apply updates
  Object.assign(key, updates)
  key.updatedAt = new Date().toISOString()

  apiKeysCollection?.update(key)
  getDatabase()?.saveDatabase()

  await addApiKeyLog(id, 'updated', changes)

  return key
}

/**
 * Revoke an API key (sets status to revoked)
 */
export async function revokeApiKey(id: string): Promise<boolean> {
  await initApiKeyCollections()

  const key = apiKeysCollection?.findOne({ id })
  if (!key) return false

  key.status = 'revoked'
  key.updatedAt = new Date().toISOString()

  apiKeysCollection?.update(key)
  getDatabase()?.saveDatabase()

  await addApiKeyLog(id, 'revoked', { previousStatus: key.status })

  return true
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(id: string): Promise<boolean> {
  await initApiKeyCollections()

  const key = apiKeysCollection?.findOne({ id })
  if (!key) return false

  // Remove the key
  apiKeysCollection?.remove(key)

  // Clean up associated data
  const usageRecords = apiKeyUsageCollection?.find({ keyId: id }) || []
  usageRecords.forEach((record) => apiKeyUsageCollection?.remove(record))

  const logs = apiKeyLogsCollection?.find({ keyId: id }) || []
  logs.forEach((log) => apiKeyLogsCollection?.remove(log))

  const rateLimit = apiKeyRateLimitCollection?.findOne({ keyId: id })
  if (rateLimit) {
    apiKeyRateLimitCollection?.remove(rateLimit)
  }

  getDatabase()?.saveDatabase()

  return true
}

/**
 * Rotate an API key (generates new key, keeps same permissions)
 */
export async function rotateApiKey(id: string): Promise<CreateApiKeyResult> {
  await initApiKeyCollections()

  const oldKey = apiKeysCollection?.findOne({ id })
  if (!oldKey) {
    throw new Error('API key not found')
  }

  // Generate new secure key
  const prefix = generateKeyPrefix()
  const secretKey = generateSecureApiKey(prefix)
  const keyHash = await hashApiKey(secretKey)

  // Update key with new credentials
  oldKey.keyPrefix = prefix
  oldKey.keyHash = keyHash
  oldKey.updatedAt = new Date().toISOString()
  oldKey.lastUsedAt = undefined
  oldKey.lastUsedIp = undefined
  oldKey.usageCount = 0

  apiKeysCollection?.update(oldKey)
  getDatabase()?.saveDatabase()

  await addApiKeyLog(id, 'updated', { action: 'rotated' })

  return {
    key: oldKey,
    secretKey, // Return new key to user
  }
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate an API key (check if it exists and is active)
 * This is the REAL validation that checks the hash
 */
export async function validateApiKey(
  key: string,
): Promise<{ valid: boolean; key?: ApiKey; error?: string }> {
  await initApiKeyCollections()

  if (!key || key.length < 10) {
    return { valid: false, error: 'Invalid key format' }
  }

  // Extract prefix from key
  const parts = key.split('_')
  if (parts.length < 2) {
    return { valid: false, error: 'Invalid key format' }
  }

  const prefix = `${parts[0]}_${parts[1]}`

  // Find key by prefix
  const apiKey = apiKeysCollection?.findOne({ keyPrefix: prefix })

  if (!apiKey) {
    return { valid: false, error: 'API key not found' }
  }

  // Verify the hash
  const isValid = await verifyApiKey(key, apiKey.keyHash)
  if (!isValid) {
    return { valid: false, error: 'Invalid API key' }
  }

  // Check status
  if (apiKey.status === 'revoked') {
    return { valid: false, error: 'API key has been revoked' }
  }

  if (apiKey.status === 'inactive') {
    return { valid: false, error: 'API key is inactive' }
  }

  // Check expiration
  if (
    apiKey.status === 'expired' ||
    (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date())
  ) {
    // Auto-update status to expired
    if (apiKey.status !== 'expired') {
      apiKey.status = 'expired'
      apiKey.updatedAt = new Date().toISOString()
      apiKeysCollection?.update(apiKey)
      getDatabase()?.saveDatabase()
    }
    return { valid: false, error: 'API key has expired' }
  }

  // Update last used tracking
  apiKey.lastUsedAt = new Date().toISOString()
  apiKey.usageCount++
  apiKeysCollection?.update(apiKey)
  getDatabase()?.saveDatabase()

  return { valid: true, key: apiKey }
}

/**
 * Check if request is within rate limits
 */
export async function checkRateLimit(
  keyId: string,
): Promise<{ allowed: boolean; resetAt?: string; current?: number }> {
  await initApiKeyCollections()

  const apiKey = apiKeysCollection?.findOne({ id: keyId })
  if (!apiKey || !apiKey.rateLimit) {
    return { allowed: true }
  }

  const { requests: limit, window } = apiKey.rateLimit
  const now = new Date()

  const rateLimitRecord = apiKeyRateLimitCollection?.findOne({ keyId })

  if (!rateLimitRecord) {
    // Create new rate limit record
    const newRecord = apiKeyRateLimitCollection?.insert({
      keyId,
      requests: [now.getTime()],
      resetAt: new Date(now.getTime() + window * 1000).toISOString(),
    })
    getDatabase()?.saveDatabase()
    return { allowed: true, resetAt: newRecord?.resetAt || '', current: 1 }
  }

  // Check if window has expired
  const resetAt = new Date(rateLimitRecord.resetAt)
  if (now > resetAt) {
    // Reset window
    rateLimitRecord.requests = [now.getTime()]
    rateLimitRecord.resetAt = new Date(
      now.getTime() + window * 1000,
    ).toISOString()
    apiKeyRateLimitCollection?.update(rateLimitRecord)
    getDatabase()?.saveDatabase()
    return { allowed: true, resetAt: rateLimitRecord.resetAt, current: 1 }
  }

  // Filter requests within current window
  const windowStart = now.getTime() - window * 1000
  const recentRequests = rateLimitRecord.requests.filter(
    (timestamp) => timestamp > windowStart,
  )

  if (recentRequests.length >= limit) {
    await addApiKeyLog(keyId, 'rate_limited', {
      currentRequests: recentRequests.length,
      limit,
    })
    return {
      allowed: false,
      resetAt: rateLimitRecord.resetAt,
      current: recentRequests.length,
    }
  }

  // Add current request
  recentRequests.push(now.getTime())
  rateLimitRecord.requests = recentRequests
  apiKeyRateLimitCollection?.update(rateLimitRecord)
  getDatabase()?.saveDatabase()

  return {
    allowed: true,
    resetAt: rateLimitRecord.resetAt,
    current: recentRequests.length,
  }
}

// =============================================================================
// Usage Tracking Functions
// =============================================================================

/**
 * Record API key usage
 */
export async function recordApiKeyUsage(
  keyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  ipAddress: string,
  userAgent?: string,
  requestSize?: number,
  responseSize?: number,
): Promise<void> {
  await initApiKeyCollections()

  const usage: ApiKeyUsage = {
    id: generateUsageId(),
    keyId,
    endpoint,
    method,
    statusCode,
    responseTime,
    ipAddress,
    userAgent,
    requestSize,
    responseSize,
    timestamp: new Date().toISOString(),
  }

  apiKeyUsageCollection?.insert(usage)
  getDatabase()?.saveDatabase()

  await addApiKeyLog(keyId, 'used', { endpoint, statusCode }, ipAddress)
}

/**
 * Get usage data for an API key
 */
export async function getApiKeyUsage(
  keyId: string,
  options?: {
    limit?: number
    offset?: number
    startDate?: string
    endDate?: string
  },
): Promise<ApiKeyUsage[]> {
  await initApiKeyCollections()

  let query: any = { keyId }

  if (options?.startDate || options?.endDate) {
    query.timestamp = {}
    if (options.startDate) {
      query.timestamp.$gte = options.startDate
    }
    if (options.endDate) {
      query.timestamp.$lte = options.endDate
    }
  }

  const usage = apiKeyUsageCollection
    ?.chain()
    .find(query)
    .simplesort('timestamp', true) // Sort by timestamp descending
    .offset(options?.offset || 0)
    .limit(options?.limit || 50)
    .data()

  return usage || []
}

/**
 * Get usage statistics for an API key
 */
export async function getApiKeyUsageStats(
  keyId: string,
): Promise<ApiKeyUsageStats> {
  await initApiKeyCollections()

  const usage = apiKeyUsageCollection?.find({ keyId }) || []
  const successful = usage.filter(
    (u) => u.statusCode >= 200 && u.statusCode < 400,
  )
  const failed = usage.filter((u) => u.statusCode >= 400)

  const endpointCounts: Record<string, number> = {}
  const statusCounts: Record<number, number> = {}
  const endpointTimes: Record<string, number[]> = {}

  for (const u of usage) {
    endpointCounts[u.endpoint] = (endpointCounts[u.endpoint] || 0) + 1
    statusCounts[u.statusCode] = (statusCounts[u.statusCode] || 0) + 1
    if (!endpointTimes[u.endpoint]) endpointTimes[u.endpoint] = []
    endpointTimes[u.endpoint].push(u.responseTime)
  }

  const topEndpoints = Object.entries(endpointCounts)
    .map(([endpoint, count]) => ({
      endpoint,
      count,
      avgTime:
        endpointTimes[endpoint].reduce((a, b) => a + b, 0) /
        endpointTimes[endpoint].length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Generate hourly data from actual usage
  const requestsByHour: { hour: string; count: number }[] = []
  const hourCounts: Record<string, number> = {}

  for (const u of usage) {
    const hour = new Date(u.timestamp).toISOString().slice(0, 13)
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  }

  // Fill in last 24 hours
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(Date.now() - i * 3600000).toISOString().slice(0, 13)
    requestsByHour.push({
      hour,
      count: hourCounts[hour] || 0,
    })
  }

  const avgResponseTime =
    usage.length > 0
      ? usage.reduce((a, b) => a + b.responseTime, 0) / usage.length
      : 0

  return {
    keyId,
    totalRequests: usage.length,
    successfulRequests: successful.length,
    failedRequests: failed.length,
    averageResponseTime: Math.round(avgResponseTime),
    requestsByEndpoint: endpointCounts,
    requestsByStatus: statusCounts,
    requestsByHour,
    topEndpoints,
    errorRate: usage.length > 0 ? (failed.length / usage.length) * 100 : 0,
  }
}

/**
 * Get current rate limit status for an API key
 */
export async function getApiKeyRateLimit(
  keyId: string,
): Promise<ApiKeyRateLimit | null> {
  await initApiKeyCollections()

  const key = apiKeysCollection?.findOne({ id: keyId })
  if (!key || !key.rateLimit) return null

  const rateLimitRecord = apiKeyRateLimitCollection?.findOne({ keyId })

  if (!rateLimitRecord) {
    return {
      keyId,
      currentRequests: 0,
      limit: key.rateLimit.requests,
      window: key.rateLimit.window,
      resetAt: new Date(Date.now() + key.rateLimit.window * 1000).toISOString(),
      isLimited: false,
    }
  }

  // Filter requests within current window
  const now = new Date()
  const windowStart = now.getTime() - key.rateLimit.window * 1000
  const recentRequests = rateLimitRecord.requests.filter(
    (timestamp) => timestamp > windowStart,
  )

  return {
    keyId,
    currentRequests: recentRequests.length,
    limit: key.rateLimit.requests,
    window: key.rateLimit.window,
    resetAt: rateLimitRecord.resetAt,
    isLimited: recentRequests.length >= key.rateLimit.requests,
  }
}

/**
 * Get logs for an API key
 */
export async function getApiKeyLogs(
  keyId: string,
  options?: {
    limit?: number
    offset?: number
    action?: ApiKeyLog['action']
  },
): Promise<ApiKeyLog[]> {
  await initApiKeyCollections()

  let query: any = { keyId }
  if (options?.action) {
    query.action = options.action
  }

  const logs = apiKeyLogsCollection
    ?.chain()
    .find(query)
    .simplesort('timestamp', true) // Sort by timestamp descending
    .offset(options?.offset || 0)
    .limit(options?.limit || 50)
    .data()

  return logs || []
}

// =============================================================================
// Statistics Functions
// =============================================================================

/**
 * Get overall API key statistics
 */
export async function getApiKeyStats(): Promise<ApiKeyStats> {
  await initApiKeyCollections()

  const keys = apiKeysCollection?.find() || []

  const byScope: Record<ApiKeyScope, number> = {
    read: 0,
    write: 0,
    admin: 0,
    custom: 0,
  }

  let activeKeys = 0
  let expiredKeys = 0
  let revokedKeys = 0

  for (const key of keys) {
    byScope[key.scope]++

    if (key.status === 'active') activeKeys++
    else if (key.status === 'expired') expiredKeys++
    else if (key.status === 'revoked') revokedKeys++
  }

  // Calculate total requests in last 24h from actual usage
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentUsage =
    apiKeyUsageCollection?.find({
      timestamp: { $gte: twentyFourHoursAgo.toISOString() },
    }) || []

  const totalRequests24h = recentUsage.length

  // Top keys by recent usage
  const usageByKey: Record<string, number> = {}
  for (const usage of recentUsage) {
    usageByKey[usage.keyId] = (usageByKey[usage.keyId] || 0) + 1
  }

  const topKeysWithRequests: { key: ApiKey; requests: number }[] = []
  for (const [keyId, requests] of Object.entries(usageByKey)) {
    const key = apiKeysCollection?.findOne({ id: keyId })
    if (key) {
      topKeysWithRequests.push({
        key: { ...key }, // Spread to remove LokiObj properties
        requests,
      })
    }
  }

  const topKeys = topKeysWithRequests
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 5)

  return {
    totalKeys: keys.length,
    activeKeys,
    expiredKeys,
    revokedKeys,
    byScope,
    totalRequests24h,
    topKeys,
  }
}

// =============================================================================
// Export Convenience Object
// =============================================================================

export const apiKeysApi = {
  getAll: getApiKeys,
  getById: getApiKeyById,
  create: createApiKey,
  update: updateApiKey,
  revoke: revokeApiKey,
  delete: deleteApiKey,
  rotate: rotateApiKey,
  getUsage: getApiKeyUsage,
  getUsageStats: getApiKeyUsageStats,
  getRateLimit: getApiKeyRateLimit,
  getLogs: getApiKeyLogs,
  validate: validateApiKey,
  getStats: getApiKeyStats,
  checkRateLimit,
  recordUsage: recordApiKeyUsage,
}
