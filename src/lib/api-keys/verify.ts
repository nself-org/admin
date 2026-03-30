#!/usr/bin/env tsx
/**
 * Verification script for API key management implementation
 * Run with: npx tsx src/lib/api-keys/verify.ts
 */

import { initDatabase } from '@/lib/database'
import { apiKeysApi, maskApiKey, validateApiKey } from './index'

async function main() {
  // Initialize database
  await initDatabase()

  // Create an API key
  const result = await apiKeysApi.create({
    name: 'Verification Test Key',
    description: 'Test key for verification',
    scope: 'write',
    rateLimit: {
      requests: 100,
      window: 60,
    },
  })
  void maskApiKey(result.secretKey)

  // Validate the key
  await validateApiKey(result.secretKey)

  // Test invalid key
  await validateApiKey('nself_xx_invalid_key')

  // List all keys
  await apiKeysApi.getAll()

  // Update the key
  await apiKeysApi.update(result.key.id, {
    description: 'Updated description',
  })
  await apiKeysApi.getById(result.key.id)

  // Revoke the key
  await apiKeysApi.revoke(result.key.id)
  await validateApiKey(result.secretKey)

  // Clean up
  await apiKeysApi.delete(result.key.id)
  await apiKeysApi.getById(result.key.id)
}

main().catch((error) => {
  console.error('❌ Verification failed:', error)
  process.exit(1)
})
