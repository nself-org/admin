# API Keys Management

Real implementation of API key management with cryptographic security, database-backed storage, and comprehensive validation.

## Features

- **Cryptographically Secure Keys**: Uses `crypto.randomBytes()` for secure key generation
- **Bcrypt Hashing**: Keys are hashed with bcrypt (cost factor 12) before storage
- **Never Store Plaintext**: API keys are only shown once during creation
- **Rate Limiting**: Per-key rate limits with sliding window algorithm
- **Usage Tracking**: Full request logging and analytics
- **Scope-Based Permissions**: Read, write, admin, and custom scopes
- **IP/Origin Restrictions**: Allow-list based access control
- **Expiration**: Optional key expiration dates
- **Key Rotation**: Generate new keys while preserving permissions
- **Audit Logging**: Complete audit trail of all key operations

## API Key Format

```
nself_ab_1234567890123456789012345678901234567890
└─┬─┘ └┬┘ └────────────────┬───────────────────┘
  │    │                   │
  │    │                   └─ Secret (40 chars, base62)
  │    └───────────────────── Random suffix (2 chars)
  └────────────────────────── Prefix (nself)
```

## Basic Usage

### Creating an API Key

```typescript
import { apiKeysApi } from '@/lib/api-keys'

const result = await apiKeysApi.create({
  name: 'Production API Key',
  description: 'Main production integration',
  scope: 'write',
  rateLimit: {
    requests: 1000,
    window: 3600, // 1 hour in seconds
  },
  allowedIps: ['203.0.113.0/24'],
  expiresAt: '2026-12-31T23:59:59Z', // Optional
})

// IMPORTANT: Save the secret key - it's only shown once!
console.log('API Key:', result.secretKey)
console.log('Key ID:', result.key.id)

// Key object contains metadata (no secret)
console.log('Key Metadata:', result.key)
```

### Validating an API Key

```typescript
import { validateApiKey } from '@/lib/api-keys'

const validation = await validateApiKey(apiKeyFromRequest)

if (!validation.valid) {
  return Response.json({ error: validation.error }, { status: 401 })
}

// Key is valid - use it
const apiKey = validation.key
console.log('Authenticated as:', apiKey.name)
```

### Using the Middleware

The middleware provides automatic API key validation, rate limiting, and usage tracking:

```typescript
import { withApiKey } from '@/lib/api-keys/middleware'
import { NextRequest, NextResponse } from 'next/server'

// Protect an API route
export const GET = withApiKey(
  async (request, { apiKey }) => {
    // API key is already validated
    // Rate limits are already checked
    // Usage is automatically tracked

    return NextResponse.json({
      message: `Hello ${apiKey.name}`,
      scope: apiKey.scope,
    })
  },
  {
    requiredScope: 'read', // Minimum required scope
    checkRateLimit: true, // Default: true
    trackUsage: true, // Default: true
  }
)
```

### Advanced Middleware Example

```typescript
import { withApiKey } from '@/lib/api-keys/middleware'

// Require specific resource permission
export const POST = withApiKey(
  async (request, { apiKey }) => {
    // Only keys with 'deployments' resource and 'execute' action can access
    return NextResponse.json({ deployed: true })
  },
  {
    requiredResource: 'deployments',
    requiredAction: 'execute',
  }
)
```

## API Key Scopes

### Read Scope

- Can read data
- Cannot create, update, or delete

### Write Scope

- Can create, read, and update
- Cannot delete or execute admin actions

### Admin Scope

- Full access to all resources
- Can create, read, update, delete, and execute

### Custom Scope

- Define explicit permissions per resource
- Fine-grained access control

```typescript
const result = await apiKeysApi.create({
  name: 'CI/CD Pipeline Key',
  scope: 'custom',
  permissions: [
    { resource: 'deployments', actions: ['create', 'read', 'execute'] },
    { resource: 'builds', actions: ['create', 'read'] },
    { resource: 'logs', actions: ['read'] },
  ],
})
```

## Rate Limiting

Rate limits use a sliding window algorithm:

```typescript
const result = await apiKeysApi.create({
  name: 'Rate Limited Key',
  scope: 'read',
  rateLimit: {
    requests: 100, // Max 100 requests
    window: 60, // Per 60 seconds
  },
})

// Check rate limit manually
const check = await checkRateLimit(keyId)
if (!check.allowed) {
  console.log('Rate limited until:', check.resetAt)
}
```

## Usage Tracking

Track every API request automatically:

```typescript
import { recordApiKeyUsage } from '@/lib/api-keys'

await recordApiKeyUsage(
  keyId,
  '/api/data/export',
  'GET',
  200, // Status code
  45, // Response time (ms)
  '192.168.1.100', // IP address
  'Mozilla/5.0 ...', // User agent (optional)
  128, // Request size (optional)
  15420 // Response size (optional)
)

// Get usage data
const usage = await apiKeysApi.getUsage(keyId, {
  limit: 50,
  offset: 0,
  startDate: '2026-01-01T00:00:00Z',
  endDate: '2026-01-31T23:59:59Z',
})

// Get usage statistics
const stats = await apiKeysApi.getUsageStats(keyId)
console.log('Total requests:', stats.totalRequests)
console.log('Success rate:', (stats.successfulRequests / stats.totalRequests) * 100)
console.log('Average response time:', stats.averageResponseTime)
```

## Key Management

### List All Keys

```typescript
const keys = await apiKeysApi.getAll()

// Filter by tenant
const tenantKeys = await apiKeysApi.getAll('tenant-123')
```

### Update a Key

```typescript
await apiKeysApi.update(keyId, {
  name: 'Updated Name',
  description: 'Updated description',
  rateLimit: { requests: 2000, window: 3600 },
})
```

### Rotate a Key

Generate a new key while keeping all settings:

```typescript
const rotated = await apiKeysApi.rotate(keyId)

// Old key no longer works
// New key has same permissions but different secret
console.log('New API key:', rotated.secretKey)
```

### Revoke a Key

Permanently disable a key (cannot be undone):

```typescript
await apiKeysApi.revoke(keyId)
```

### Delete a Key

Remove key and all associated data:

```typescript
await apiKeysApi.delete(keyId)
```

## Security Features

### IP Restrictions

```typescript
const result = await apiKeysApi.create({
  name: 'IP Restricted Key',
  scope: 'read',
  allowedIps: [
    '192.168.1.100', // Single IP
    '10.0.0.0/24', // CIDR range
  ],
})
```

### Origin Restrictions

```typescript
const result = await apiKeysApi.create({
  name: 'Origin Restricted Key',
  scope: 'read',
  allowedOrigins: ['https://app.example.com', 'https://api.example.com'],
})
```

### Expiration

```typescript
const futureDate = new Date()
futureDate.setMonth(futureDate.getMonth() + 6)

const result = await apiKeysApi.create({
  name: 'Temporary Key',
  scope: 'read',
  expiresAt: futureDate.toISOString(),
})
```

## Audit Logging

All key operations are logged:

```typescript
const logs = await apiKeysApi.getLogs(keyId, {
  limit: 100,
  offset: 0,
  action: 'used', // Filter by action type
})

// Log actions:
// - created
// - updated
// - activated
// - deactivated
// - revoked
// - used
// - rate_limited
```

## Statistics

```typescript
const stats = await apiKeysApi.getStats()

console.log('Total keys:', stats.totalKeys)
console.log('Active keys:', stats.activeKeys)
console.log('Keys by scope:', stats.byScope)
console.log('Requests (24h):', stats.totalRequests24h)
console.log('Top 5 keys:', stats.topKeys)
```

## Best Practices

1. **Never Log Secret Keys**: Only log the masked version

   ```typescript
   import { maskApiKey } from '@/lib/api-keys'
   console.log('Key created:', maskApiKey(secretKey))
   ```

2. **Use Appropriate Scopes**: Start with minimum required scope

   ```typescript
   // ✅ Good: Only needs read access
   const result = await apiKeysApi.create({
     name: 'Analytics Dashboard',
     scope: 'read',
   })

   // ❌ Bad: Unnecessarily broad access
   const result = await apiKeysApi.create({
     name: 'Analytics Dashboard',
     scope: 'admin', // Overkill for read-only dashboard
   })
   ```

3. **Set Expiration for Temporary Keys**

   ```typescript
   const result = await apiKeysApi.create({
     name: 'Demo Account Key',
     scope: 'read',
     expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
   })
   ```

4. **Use IP Restrictions for Server-to-Server**

   ```typescript
   const result = await apiKeysApi.create({
     name: 'Backend Integration',
     scope: 'write',
     allowedIps: ['203.0.113.10'], // Your server IP
   })
   ```

5. **Rotate Keys Regularly**

   ```typescript
   // Rotate keys every 90 days
   const created = new Date(apiKey.createdAt)
   const age = Date.now() - created.getTime()
   const ninetyDays = 90 * 24 * 60 * 60 * 1000

   if (age > ninetyDays) {
     await apiKeysApi.rotate(apiKey.id)
   }
   ```

## API Reference

### Functions

- `createApiKey(input)` - Create new API key
- `validateApiKey(key)` - Validate API key
- `checkRateLimit(keyId)` - Check rate limit status
- `recordApiKeyUsage(...)` - Record usage
- `getApiKeys(tenantId?)` - List API keys
- `getApiKeyById(id)` - Get single key
- `updateApiKey(id, updates)` - Update key
- `revokeApiKey(id)` - Revoke key
- `deleteApiKey(id)` - Delete key
- `rotateApiKey(id)` - Rotate key
- `getApiKeyUsage(keyId, options)` - Get usage data
- `getApiKeyUsageStats(keyId)` - Get usage stats
- `getApiKeyRateLimit(keyId)` - Get rate limit status
- `getApiKeyLogs(keyId, options)` - Get audit logs
- `getApiKeyStats()` - Get overall stats

### Types

See `/src/types/api-key.ts` for complete type definitions.

## Testing

Run the test suite:

```bash
npm test src/lib/api-keys/__tests__/api-keys.test.ts
```

Tests cover:

- Cryptographic key generation
- Hash validation
- Rate limiting
- Usage tracking
- Permissions
- Security features
- Audit logging
