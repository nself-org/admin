import { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
  lockedUntil?: number // Account lockout timestamp
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Account lockout after excessive failed attempts
const LOCKOUT_THRESHOLD = 10 // Lock after 10 failed attempts
const LOCKOUT_DURATION = 60 * 60 * 1000 // 1 hour lockout

// Configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_WINDOW_1MIN = 60 * 1000 // 1 minute window for per-minute limits
const MAX_REQUESTS = {
  auth: 5, // 5 login attempts per 15 minutes
  api: 100, // 100 API calls per 15 minutes
  heavy: 10, // 10 heavy operations per 15 minutes
}

// Per-minute limits (stricter, shorter window)
// auth_strict: 10/min on login + TOTP endpoints
// wizard: 60/min on wizard endpoints
const MAX_REQUESTS_PER_MIN: Record<string, number> = {
  auth_strict: 10,
  wizard: 60,
}

/**
 * Get client identifier from request
 */
function getClientId(request: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || real || 'unknown'

  // Combine with user agent for better fingerprinting
  const userAgent = request.headers.get('user-agent') || 'unknown'
  return `${ip}:${userAgent.substring(0, 50)}`
}

/**
 * Check if account is locked out
 */
export function isLockedOut(request: NextRequest): boolean {
  const clientId = getClientId(request)
  const key = `auth:${clientId}`
  const entry = rateLimitStore.get(key)
  const now = Date.now()

  if (entry?.lockedUntil && entry.lockedUntil > now) {
    return true
  }

  // Clear lockout if expired
  if (entry?.lockedUntil && entry.lockedUntil <= now) {
    delete entry.lockedUntil
  }

  return false
}

/**
 * Lock account after excessive failed attempts
 */
export function lockAccount(request: NextRequest): void {
  const clientId = getClientId(request)
  const key = `auth:${clientId}`
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (entry && entry.count >= LOCKOUT_THRESHOLD) {
    entry.lockedUntil = now + LOCKOUT_DURATION
    rateLimitStore.set(key, entry)
  }
}

/**
 * Check if request is rate limited
 */
export function isRateLimited(
  request: NextRequest,
  type: 'auth' | 'api' | 'heavy' = 'api',
): boolean {
  const clientId = getClientId(request)
  const key = `${type}:${clientId}`
  const now = Date.now()
  const maxRequests = MAX_REQUESTS[type]

  // Check for account lockout first
  if (type === 'auth' && isLockedOut(request)) {
    return true
  }

  // Clean up old entries
  for (const [k, entry] of rateLimitStore.entries()) {
    if (
      entry.resetTime < now &&
      (!entry.lockedUntil || entry.lockedUntil < now)
    ) {
      rateLimitStore.delete(k)
    }
  }

  const entry = rateLimitStore.get(key)

  if (!entry) {
    // First request
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    })
    return false
  }

  if (entry.resetTime < now) {
    // Window expired, reset
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
      lockedUntil: entry.lockedUntil, // Preserve lockout
    })
    return false
  }

  // Increment count
  entry.count++

  // Check if we should lock the account
  if (type === 'auth' && entry.count >= LOCKOUT_THRESHOLD) {
    lockAccount(request)
  }

  // Check if limit exceeded
  if (entry.count > maxRequests) {
    return true
  }

  return false
}

/**
 * Get remaining requests for client
 */
export function getRateLimitInfo(
  request: NextRequest,
  type: 'auth' | 'api' | 'heavy' = 'api',
): {
  remaining: number
  resetTime: number
  limit: number
} {
  const clientId = getClientId(request)
  const key = `${type}:${clientId}`
  const now = Date.now()
  const maxRequests = MAX_REQUESTS[type]

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    return {
      remaining: maxRequests,
      resetTime: now + RATE_LIMIT_WINDOW,
      limit: maxRequests,
    }
  }

  return {
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
    limit: maxRequests,
  }
}

/**
 * Clear rate limit for a client (e.g., after successful login)
 */
export function clearRateLimit(
  request: NextRequest,
  type: 'auth' | 'api' | 'heavy' = 'auth',
): void {
  const clientId = getClientId(request)
  const key = `${type}:${clientId}`
  rateLimitStore.delete(key)
}

/**
 * Clear all rate limits (for testing purposes)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear()
}

/**
 * Check if request is rate limited using a per-minute window.
 * type: 'auth_strict' (10/min) | 'wizard' (60/min)
 */
export function isRateLimitedPerMin(
  request: NextRequest,
  type: 'auth_strict' | 'wizard',
): boolean {
  const clientId = getClientId(request)
  const key = `permin:${type}:${clientId}`
  const now = Date.now()
  const maxRequests = MAX_REQUESTS_PER_MIN[type]

  // Clean stale entries
  for (const [k, entry] of rateLimitStore.entries()) {
    if (
      entry.resetTime < now &&
      (!entry.lockedUntil || entry.lockedUntil < now)
    ) {
      rateLimitStore.delete(k)
    }
  }

  const entry = rateLimitStore.get(key)

  if (!entry) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_1MIN,
    })
    return false
  }

  if (entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_1MIN,
    })
    return false
  }

  entry.count++
  return entry.count > maxRequests
}

/**
 * Get remaining requests for per-minute limit.
 */
export function getRateLimitInfoPerMin(
  request: NextRequest,
  type: 'auth_strict' | 'wizard',
): { remaining: number; resetTime: number; limit: number } {
  const clientId = getClientId(request)
  const key = `permin:${type}:${clientId}`
  const now = Date.now()
  const maxRequests = MAX_REQUESTS_PER_MIN[type]

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    return {
      remaining: maxRequests,
      resetTime: now + RATE_LIMIT_WINDOW_1MIN,
      limit: maxRequests,
    }
  }

  return {
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
    limit: maxRequests,
  }
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60 * 1000) // Clean every minute
