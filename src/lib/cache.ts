/**
 * Simple in-memory cache with TTL support
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>()
  private timers = new Map<string, NodeJS.Timeout>()

  /**
   * Get cached data if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set data in cache with TTL
   */
  set<T>(key: string, data: T, ttl: number = 60000): void {
    // Clear existing timer if any
    this.clearTimer(key)

    // Store in cache
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })

    // Set auto-cleanup timer
    const timer = setTimeout(() => {
      this.delete(key)
    }, ttl)
    this.timers.set(key, timer)
  }

  /**
   * Delete from cache
   */
  delete(key: string): void {
    this.cache.delete(key)
    this.clearTimer(key)
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers.clear()
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern

    Array.from(this.cache.keys()).forEach((key) => {
      if (regex.test(key)) {
        this.delete(key)
      }
    })
  }

  private clearTimer(key: string): void {
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
  }
}

// Singleton instance
export const cache = new DataCache()

// Cache TTL presets (in milliseconds)
export const CacheTTL = {
  SHORT: 10000, // 10 seconds - for rapidly changing data
  MEDIUM: 60000, // 1 minute - for moderately dynamic data
  LONG: 300000, // 5 minutes - for relatively static data
  HOUR: 3600000, // 1 hour - for very static data
} as const

/**
 * React hook for cached data fetching
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM,
  _dependencies: any[] = []
): {
  data: T | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
} {
  const [data, setData] = React.useState<T | null>(() => cache.get<T>(key))
  const [loading, setLoading] = React.useState(!data)
  const [error, setError] = React.useState<Error | null>(null)

  const refresh = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await fetcher()
      cache.set(key, result, ttl)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [key, ttl, fetcher])

  React.useEffect(() => {
    const cached = cache.get<T>(key)
    if (cached) {
      setData(cached)
      setLoading(false)
    } else {
      refresh()
    }
  }, [key, refresh])

  return { data, loading, error, refresh }
}

// Import React for the hook
import React from 'react'
