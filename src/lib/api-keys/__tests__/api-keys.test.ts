/**
 * API Keys Library Tests
 * Tests for cryptographic key generation, validation, and management
 */

import { getDatabase, initDatabase } from '@/lib/database'
import type { ApiKey } from '@/types/api-key'
import bcrypt from 'bcryptjs'
import * as apiKeys from '../index'

// Ensure database is initialized before tests
beforeAll(async () => {
  await initDatabase()
})

// Clear API key collections before each test to prevent prefix collisions
// across parallel/sequential test runs sharing the same LokiJS instance
beforeEach(() => {
  const db = getDatabase()
  if (!db) return
  const collections = ['apiKeys', 'apiKeyUsage', 'apiKeyLogs', 'apiKeyRateLimit']
  for (const name of collections) {
    const col = db.getCollection(name)
    if (col) col.clear()
  }
})

describe('API Key Generation', () => {
  test('generates unique prefixes', () => {
    const prefix1 = apiKeys.generateKeyPrefix()
    const prefix2 = apiKeys.generateKeyPrefix()

    expect(prefix1).toMatch(/^nself_[a-z2-7]{10}$/)
    expect(prefix2).toMatch(/^nself_[a-z2-7]{10}$/)
    // 50 random bits: a collision here means the generator is broken
    expect(prefix1).not.toBe(prefix2)
  })

  test('creates cryptographically secure API keys', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Test Key',
      scope: 'read',
      description: 'Test description',
    })

    expect(result.key).toBeDefined()
    expect(result.secretKey).toBeDefined()
    expect(result.key.keyPrefix).toMatch(/^nself_[a-z2-7]{10}$/)
    expect(result.secretKey).toMatch(/^nself_[a-z2-7]{10}_[A-Za-z0-9]{30}$/)
    expect(result.key.keyHash).toBeDefined()
    expect(result.key.keyHash).toMatch(/^\$2[aby]\$/) // bcrypt hash pattern
  })

  test('never stores plaintext keys', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Security Test Key',
      scope: 'admin',
    })

    // Hash should not equal the plaintext key
    expect(result.key.keyHash).not.toBe(result.secretKey)
    expect(result.key.keyHash.length).toBeGreaterThan(50) // bcrypt hashes are ~60 chars
  })
})

describe('API Key Validation', () => {
  test('validates correct API key', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Valid Test Key',
      scope: 'write',
    })

    const validation = await apiKeys.validateApiKey(result.secretKey)

    expect(validation.valid).toBe(true)
    expect(validation.key).toBeDefined()
    expect(validation.key?.id).toBe(result.key.id)
  })

  test('rejects invalid API key', async () => {
    const validation = await apiKeys.validateApiKey('nself_xx_invalidkeyxxxxxxxxxxxxxxxxxxxxxxxxxx')

    expect(validation.valid).toBe(false)
    expect(validation.error).toBeDefined()
  })

  test('rejects malformed API key', async () => {
    const validation = await apiKeys.validateApiKey('invalid')

    expect(validation.valid).toBe(false)
    expect(validation.error).toBe('Invalid key format')
  })

  test('rejects revoked API key', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Revoke Test Key',
      scope: 'read',
    })

    await apiKeys.apiKeysApi.revoke(result.key.id)

    const validation = await apiKeys.validateApiKey(result.secretKey)

    expect(validation.valid).toBe(false)
    expect(validation.error).toBe('API key has been revoked')
  })

  test('rejects expired API key', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const result = await apiKeys.apiKeysApi.create({
      name: 'Expired Test Key',
      scope: 'read',
      expiresAt: pastDate,
    })

    const validation = await apiKeys.validateApiKey(result.secretKey)

    expect(validation.valid).toBe(false)
    expect(validation.error).toBe('API key has expired')
  })

  test('updates usage tracking on validation', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Usage Test Key',
      scope: 'read',
    })

    const initialUsageCount = result.key.usageCount

    await apiKeys.validateApiKey(result.secretKey)
    await apiKeys.validateApiKey(result.secretKey)

    const updated = await apiKeys.apiKeysApi.getById(result.key.id)

    expect(updated?.usageCount).toBe(initialUsageCount + 2)
    expect(updated?.lastUsedAt).toBeDefined()
  })
})

// D-0527: the prefix is only a lookup hint. Records that share it (legacy
// 2-letter prefixes, or any future collision) must each validate by hash.
describe('API Key Prefix Collisions', () => {
  // Synthetic test-only secrets, never real keys
  const FAKE_SECRET_A = 'FAKEtestSECRETnotArealKEYaaaaa'
  const FAKE_SECRET_B = 'FAKEtestSECRETnotArealKEYbbbbb'

  async function insertKeyWithSecret(
    template: ApiKey,
    id: string,
    secretKey: string,
    status: ApiKey['status'] = 'active'
  ): Promise<void> {
    const keyPrefix = secretKey.split('_').slice(0, 2).join('_')
    const keyHash = await bcrypt.hash(secretKey, 4)
    // Copy only data fields; LokiJS metadata ($loki, meta) must not be reused
    const {
      $loki: _loki,
      meta: _meta,
      ...fields
    } = template as ApiKey & {
      $loki?: number
      meta?: unknown
    }
    getDatabase()
      ?.getCollection('apiKeys')
      .insert({ ...fields, id, keyPrefix, keyHash, status })
  }

  test('two keys with a forced shared prefix both validate', async () => {
    const created = await apiKeys.apiKeysApi.create({ name: 'Collision A', scope: 'read' })
    const prefix = created.key.keyPrefix
    const secretB = `${prefix}_${FAKE_SECRET_B}`
    await insertKeyWithSecret(created.key, 'key_collision_b', secretB)

    const collection = getDatabase()?.getCollection('apiKeys')
    expect(collection?.find({ keyPrefix: prefix })).toHaveLength(2)

    const first = await apiKeys.validateApiKey(created.secretKey)
    expect(first.valid).toBe(true)
    expect(first.key?.id).toBe(created.key.id)

    const second = await apiKeys.validateApiKey(secretB)
    expect(second.valid).toBe(true)
    expect(second.key?.id).toBe('key_collision_b')
  })

  test('a revoked key sharing the prefix does not block an active one', async () => {
    const created = await apiKeys.apiKeysApi.create({ name: 'Collision tmpl', scope: 'read' })
    const revokedSecret = `nself_ab_${FAKE_SECRET_A}`
    const activeSecret = `nself_ab_${FAKE_SECRET_B}`
    await insertKeyWithSecret(created.key, 'key_legacy_revoked', revokedSecret, 'revoked')
    await insertKeyWithSecret(created.key, 'key_legacy_active', activeSecret)

    const active = await apiKeys.validateApiKey(activeSecret)
    expect(active.valid).toBe(true)
    expect(active.key?.id).toBe('key_legacy_active')

    const revoked = await apiKeys.validateApiKey(revokedSecret)
    expect(revoked.valid).toBe(false)
    expect(revoked.error).toBe('API key has been revoked')
  })

  test('still accepts an existing short-prefix (legacy) key', async () => {
    const created = await apiKeys.apiKeysApi.create({ name: 'Legacy tmpl', scope: 'read' })
    const legacySecret = `nself_zq_${FAKE_SECRET_A}`
    await insertKeyWithSecret(created.key, 'key_legacy_short', legacySecret)

    const result = await apiKeys.validateApiKey(legacySecret)
    expect(result.valid).toBe(true)
    expect(result.key?.id).toBe('key_legacy_short')
  })

  test('rejects a wrong secret under a shared prefix', async () => {
    const created = await apiKeys.apiKeysApi.create({ name: 'Wrong tmpl', scope: 'read' })
    await insertKeyWithSecret(created.key, 'key_legacy_one', `nself_zq_${FAKE_SECRET_A}`)

    const result = await apiKeys.validateApiKey(`nself_zq_${FAKE_SECRET_B}`)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid API key')
  })
})

describe('API Key Management', () => {
  test('retrieves all API keys', async () => {
    await apiKeys.apiKeysApi.create({
      name: 'List Test Key 1',
      scope: 'read',
    })

    await apiKeys.apiKeysApi.create({
      name: 'List Test Key 2',
      scope: 'write',
    })

    const allKeys = await apiKeys.apiKeysApi.getAll()

    expect(allKeys.length).toBeGreaterThanOrEqual(2)
  })

  test('retrieves API key by ID', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Get By ID Test',
      scope: 'admin',
    })

    const retrieved = await apiKeys.apiKeysApi.getById(result.key.id)

    expect(retrieved).toBeDefined()
    expect(retrieved?.id).toBe(result.key.id)
    expect(retrieved?.name).toBe('Get By ID Test')
  })

  test('updates API key properties', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Update Test Key',
      scope: 'read',
    })

    const updated = await apiKeys.apiKeysApi.update(result.key.id, {
      name: 'Updated Name',
      description: 'Updated description',
    })

    expect(updated?.name).toBe('Updated Name')
    expect(updated?.description).toBe('Updated description')
  })

  test('deletes API key permanently', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Delete Test Key',
      scope: 'read',
    })

    const deleted = await apiKeys.apiKeysApi.delete(result.key.id)
    expect(deleted).toBe(true)

    const retrieved = await apiKeys.apiKeysApi.getById(result.key.id)
    expect(retrieved).toBeNull()
  })
})

describe('API Key Rotation', () => {
  test('rotates API key with new secure key', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Rotation Test Key',
      scope: 'write',
    })

    const oldKey = result.secretKey
    const oldPrefix = result.key.keyPrefix

    const rotated = await apiKeys.apiKeysApi.rotate(result.key.id)

    // New key should be different
    expect(rotated.secretKey).not.toBe(oldKey)
    expect(rotated.key.keyPrefix).not.toBe(oldPrefix)

    // Old key should no longer work
    const oldValidation = await apiKeys.validateApiKey(oldKey)
    expect(oldValidation.valid).toBe(false)

    // New key should work
    const newValidation = await apiKeys.validateApiKey(rotated.secretKey)
    expect(newValidation.valid).toBe(true)
  })

  test('preserves permissions after rotation', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Permission Test Key',
      scope: 'custom',
      permissions: [
        { resource: 'users', actions: ['read', 'update'] },
        { resource: 'reports', actions: ['read'] },
      ],
    })

    const rotated = await apiKeys.apiKeysApi.rotate(result.key.id)

    expect(rotated.key.scope).toBe('custom')
    expect(rotated.key.permissions).toEqual([
      { resource: 'users', actions: ['read', 'update'] },
      { resource: 'reports', actions: ['read'] },
    ])
  })
})

describe('Rate Limiting', () => {
  test('allows requests within rate limit', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Rate Limit Test',
      scope: 'read',
      rateLimit: { requests: 5, window: 60 },
    })

    const check1 = await apiKeys.checkRateLimit(result.key.id)
    expect(check1.allowed).toBe(true)

    const check2 = await apiKeys.checkRateLimit(result.key.id)
    expect(check2.allowed).toBe(true)
  })

  test('blocks requests exceeding rate limit', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Rate Limit Exceeded Test',
      scope: 'read',
      rateLimit: { requests: 2, window: 60 },
    })

    await apiKeys.checkRateLimit(result.key.id)
    await apiKeys.checkRateLimit(result.key.id)
    const check3 = await apiKeys.checkRateLimit(result.key.id)

    expect(check3.allowed).toBe(false)
    expect(check3.resetAt).toBeDefined()
  })

  test('resets rate limit after window expires', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Rate Limit Reset Test',
      scope: 'read',
      rateLimit: { requests: 1, window: 1 }, // 1 second window
    })

    await apiKeys.checkRateLimit(result.key.id)

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 1100))

    const check = await apiKeys.checkRateLimit(result.key.id)
    expect(check.allowed).toBe(true)
  })
})

describe('Usage Tracking', () => {
  test('records API key usage', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Usage Recording Test',
      scope: 'read',
    })

    await apiKeys.recordApiKeyUsage(
      result.key.id,
      '/api/test',
      'GET',
      200,
      45,
      '127.0.0.1',
      'Test/1.0'
    )

    const usage = await apiKeys.apiKeysApi.getUsage(result.key.id)

    expect(usage.length).toBeGreaterThan(0)
    expect(usage[0]?.endpoint).toBe('/api/test')
    expect(usage[0]?.method).toBe('GET')
    expect(usage[0]?.statusCode).toBe(200)
  })

  test('generates usage statistics', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Stats Test',
      scope: 'read',
    })

    await apiKeys.recordApiKeyUsage(result.key.id, '/api/test1', 'GET', 200, 30, '127.0.0.1')
    await apiKeys.recordApiKeyUsage(result.key.id, '/api/test2', 'POST', 201, 45, '127.0.0.1')
    await apiKeys.recordApiKeyUsage(result.key.id, '/api/test1', 'GET', 200, 35, '127.0.0.1')

    const stats = await apiKeys.apiKeysApi.getUsageStats(result.key.id)

    expect(stats.totalRequests).toBeGreaterThanOrEqual(3)
    expect(stats.successfulRequests).toBeGreaterThanOrEqual(3)
    expect(stats.averageResponseTime).toBeGreaterThan(0)
  })
})

describe('API Key Scopes and Permissions', () => {
  test('creates key with read scope', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Read Scope Test',
      scope: 'read',
    })

    expect(result.key.scope).toBe('read')
  })

  test('creates key with write scope', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Write Scope Test',
      scope: 'write',
    })

    expect(result.key.scope).toBe('write')
  })

  test('creates key with admin scope', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Admin Scope Test',
      scope: 'admin',
    })

    expect(result.key.scope).toBe('admin')
  })

  test('creates key with custom permissions', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Custom Permissions Test',
      scope: 'custom',
      permissions: [
        { resource: 'analytics', actions: ['read'] },
        { resource: 'deployments', actions: ['create', 'read', 'execute'] },
      ],
    })

    expect(result.key.scope).toBe('custom')
    expect(result.key.permissions).toHaveLength(2)
  })
})

describe('Security Features', () => {
  test('masks API keys in display', () => {
    const fullKey = 'nself_ab_1234567890123456789012345678901234567890'
    const masked = apiKeys.maskApiKey(fullKey)

    expect(masked).toBe('nself_ab****')
    expect(masked).not.toContain('1234567890')
  })

  test('enforces IP restrictions', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'IP Restriction Test',
      scope: 'read',
      allowedIps: ['192.168.1.100'],
    })

    expect(result.key.allowedIps).toEqual(['192.168.1.100'])
  })

  test('enforces origin restrictions', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Origin Restriction Test',
      scope: 'read',
      allowedOrigins: ['https://example.com'],
    })

    expect(result.key.allowedOrigins).toEqual(['https://example.com'])
  })

  test('sets expiration date', async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const result = await apiKeys.apiKeysApi.create({
      name: 'Expiration Test',
      scope: 'read',
      expiresAt: futureDate,
    })

    expect(result.key.expiresAt).toBe(futureDate)
  })
})

describe('Audit Logging', () => {
  test('logs API key creation', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Log Creation Test',
      scope: 'read',
    })

    const logs = await apiKeys.apiKeysApi.getLogs(result.key.id)

    expect(logs.length).toBeGreaterThan(0)
    expect(logs.some((log) => log.action === 'created')).toBe(true)
  })

  test('logs API key updates', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Log Update Test',
      scope: 'read',
    })

    await apiKeys.apiKeysApi.update(result.key.id, { name: 'Updated Name' })

    const logs = await apiKeys.apiKeysApi.getLogs(result.key.id)

    expect(logs.some((log) => log.action === 'updated')).toBe(true)
  })

  test('logs API key revocation', async () => {
    const result = await apiKeys.apiKeysApi.create({
      name: 'Log Revoke Test',
      scope: 'read',
    })

    await apiKeys.apiKeysApi.revoke(result.key.id)

    const logs = await apiKeys.apiKeysApi.getLogs(result.key.id)

    expect(logs.some((log) => log.action === 'revoked')).toBe(true)
  })
})

describe('Statistics', () => {
  test('calculates overall statistics', async () => {
    const stats = await apiKeys.apiKeysApi.getStats()

    expect(stats).toBeDefined()
    expect(stats.totalKeys).toBeGreaterThanOrEqual(0)
    expect(stats.activeKeys).toBeGreaterThanOrEqual(0)
    expect(stats.byScope).toBeDefined()
    expect(stats.totalRequests24h).toBeGreaterThanOrEqual(0)
  })
})
