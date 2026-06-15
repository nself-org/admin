/**
 * API Key validation middleware for protecting API routes
 */

import type { ApiKey } from '@/types/api-key'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, recordApiKeyUsage, validateApiKey } from './index'

export interface ApiKeyValidationResult {
  valid: boolean
  key?: ApiKey
  error?: string
  rateLimited?: boolean
}

/**
 * Extract API key from request headers
 * Supports multiple header formats:
 * - Authorization: Bearer <key>
 * - X-API-Key: <key>
 */
export function extractApiKey(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key')
  if (apiKeyHeader) {
    return apiKeyHeader
  }

  return null
}

/**
 * Validate API key from request and check permissions
 */
export async function validateRequest(
  request: NextRequest,
  options?: {
    requiredScope?: 'read' | 'write' | 'admin'
    requiredResource?: string
    requiredAction?: 'create' | 'read' | 'update' | 'delete' | 'execute'
    checkRateLimit?: boolean
  }
): Promise<ApiKeyValidationResult> {
  // Extract API key
  const key = extractApiKey(request)

  if (!key) {
    return {
      valid: false,
      error: 'API key required. Provide key in Authorization header or X-API-Key header.',
    }
  }

  // Validate key
  const validation = await validateApiKey(key)

  if (!validation.valid || !validation.key) {
    return {
      valid: false,
      error: validation.error || 'Invalid API key',
    }
  }

  const apiKey = validation.key

  // Check IP restrictions
  if (apiKey.allowedIps && apiKey.allowedIps.length > 0) {
    const clientIp = getClientIp(request)
    if (!isIpAllowed(clientIp, apiKey.allowedIps)) {
      return {
        valid: false,
        error: 'IP address not allowed for this API key',
      }
    }
  }

  // Check origin restrictions
  if (apiKey.allowedOrigins && apiKey.allowedOrigins.length > 0) {
    const origin = request.headers.get('origin')
    if (!origin || !apiKey.allowedOrigins.includes(origin)) {
      return {
        valid: false,
        error: 'Origin not allowed for this API key',
      }
    }
  }

  // Check scope
  if (options?.requiredScope) {
    if (!hasRequiredScope(apiKey, options.requiredScope)) {
      return {
        valid: false,
        error: `API key requires ${options.requiredScope} scope`,
      }
    }
  }

  // Check resource permissions
  if (options?.requiredResource && options?.requiredAction) {
    if (!hasResourcePermission(apiKey, options.requiredResource, options.requiredAction)) {
      return {
        valid: false,
        error: `API key does not have ${options.requiredAction} permission for ${options.requiredResource}`,
      }
    }
  }

  // Check rate limit
  if (options?.checkRateLimit !== false) {
    const rateLimitCheck = await checkRateLimit(apiKey.id)
    if (!rateLimitCheck.allowed) {
      return {
        valid: false,
        error: 'Rate limit exceeded',
        rateLimited: true,
      }
    }
  }

  return {
    valid: true,
    key: apiKey,
  }
}

/**
 * Middleware wrapper for API routes
 * Usage:
 *   export const GET = withApiKey(async (request, { apiKey }) => {
 *     // Your handler with validated apiKey
 *   }, { requiredScope: 'read' })
 */
export function withApiKey(
  handler: (request: NextRequest, context: { apiKey: ApiKey; params?: any }) => Promise<Response>,
  options?: {
    requiredScope?: 'read' | 'write' | 'admin'
    requiredResource?: string
    requiredAction?: 'create' | 'read' | 'update' | 'delete' | 'execute'
    checkRateLimit?: boolean
    trackUsage?: boolean
  }
) {
  return async (request: NextRequest, context?: { params?: any }): Promise<Response> => {
    const startTime = Date.now()

    // Validate API key
    const validation = await validateRequest(request, options)

    if (!validation.valid) {
      const response = NextResponse.json(
        {
          success: false,
          error: validation.error,
          rateLimited: validation.rateLimited,
        },
        { status: validation.rateLimited ? 429 : 401 }
      )

      return response
    }

    try {
      // Call the handler
      const response = await handler(request, {
        apiKey: validation.key!,
        params: context?.params,
      })

      // Track usage if enabled
      if (options?.trackUsage !== false) {
        const responseTime = Date.now() - startTime
        const statusCode = response.status

        // Record usage asynchronously (don't wait)
        recordApiKeyUsage(
          validation.key!.id,
          new URL(request.url).pathname,
          request.method,
          statusCode,
          responseTime,
          getClientIp(request),
          request.headers.get('user-agent') || undefined
        ).catch(console.error)
      }

      return response
    } catch (error) {
      // Track error
      if (options?.trackUsage !== false) {
        const responseTime = Date.now() - startTime
        recordApiKeyUsage(
          validation.key!.id,
          new URL(request.url).pathname,
          request.method,
          500,
          responseTime,
          getClientIp(request),
          request.headers.get('user-agent') || undefined
        ).catch(console.error)
      }

      throw error
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string {
  // Check common headers
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return (forwarded.split(',')[0] ?? '').trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback
  return 'unknown'
}

/**
 * Check if IP is allowed based on allowedIps list
 * Supports CIDR notation (e.g., 192.168.1.0/24)
 */
function isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
  for (const allowed of allowedIps) {
    if (allowed.includes('/')) {
      // CIDR notation
      if (isIpInCidr(clientIp, allowed)) {
        return true
      }
    } else {
      // Exact match
      if (clientIp === allowed) {
        return true
      }
    }
  }
  return false
}

/**
 * Check if IP is in CIDR range
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  // Simple IPv4 CIDR check
  const [range, bits] = cidr.split('/')
  const mask = ~(2 ** (32 - parseInt(bits ?? '32')) - 1)

  const ipNum = ipToNumber(ip)
  const rangeNum = ipToNumber(range ?? '')

  return (ipNum & mask) === (rangeNum & mask)
}

/**
 * Convert IPv4 address to number
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.')
  return (
    (parseInt(parts[0] ?? '0') << 24) +
    (parseInt(parts[1] ?? '0') << 16) +
    (parseInt(parts[2] ?? '0') << 8) +
    parseInt(parts[3] ?? '0')
  )
}

/**
 * Check if API key has required scope
 */
function hasRequiredScope(apiKey: ApiKey, requiredScope: 'read' | 'write' | 'admin'): boolean {
  const scopeHierarchy = {
    read: 0,
    write: 1,
    admin: 2,
    custom: -1, // Custom scope requires explicit permission check
  }

  const keyLevel = scopeHierarchy[apiKey.scope]
  const requiredLevel = scopeHierarchy[requiredScope]

  // Admin can do everything
  if (keyLevel === 2) return true

  // Custom scope needs permission check
  if (keyLevel === -1) return false

  return keyLevel >= requiredLevel
}

/**
 * Check if API key has permission for specific resource/action
 */
function hasResourcePermission(
  apiKey: ApiKey,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete' | 'execute'
): boolean {
  // Admin scope has all permissions
  if (apiKey.scope === 'admin') return true

  // Check permissions array
  if (!apiKey.permissions || apiKey.permissions.length === 0) {
    // Fall back to scope-based permissions
    if (apiKey.scope === 'read') return action === 'read'
    if (apiKey.scope === 'write') return ['create', 'read', 'update'].includes(action)
    return false
  }

  // Check explicit permissions
  const permission = apiKey.permissions.find((p) => p.resource === resource)
  if (!permission) return false

  return permission.actions.includes(action)
}
