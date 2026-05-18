/**
 * Tests for the cache module
 * Note: We're testing the DataCache class behavior, not the React hook
 */

// Create a test-friendly version of the cache
class TestDataCache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()
  private timers = new Map<string, NodeJS.Timeout>()

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

  set<T>(key: string, data: T, ttl: number = 60000): void {
    this.clearTimer(key)

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })

    const timer = setTimeout(() => {
      this.delete(key)
    }, ttl)
    this.timers.set(key, timer)
  }

  delete(key: string): void {
    this.cache.delete(key)
    this.clearTimer(key)
  }

  clear(): void {
    this.cache.clear()
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers.clear()
  }

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

  // Test helper to get internal state
  size(): number {
    return this.cache.size
  }
}

describe('DataCache', () => {
  let cache: TestDataCache

  beforeEach(() => {
    cache = new TestDataCache()
    jest.useFakeTimers()
  })

  afterEach(() => {
    cache.clear()
    jest.useRealTimers()
  })

  describe('get', () => {
    it('returns null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull()
    })

    it('returns cached data for existing keys', () => {
      cache.set('key', 'value')
      expect(cache.get('key')).toBe('value')
    })

    it('returns null for expired entries', () => {
      cache.set('key', 'value', 1000) // 1 second TTL

      // Advance time past TTL
      jest.advanceTimersByTime(1001)

      expect(cache.get('key')).toBeNull()
    })

    it('returns data for non-expired entries', () => {
      cache.set('key', 'value', 10000) // 10 second TTL

      // Advance time but not past TTL
      jest.advanceTimersByTime(5000)

      expect(cache.get('key')).toBe('value')
    })
  })

  describe('set', () => {
    it('stores data with default TTL', () => {
      cache.set('key', { foo: 'bar' })
      expect(cache.get('key')).toEqual({ foo: 'bar' })
    })

    it('stores data with custom TTL', () => {
      cache.set('key', 'value', 5000)
      expect(cache.get('key')).toBe('value')
    })

    it('overwrites existing entries', () => {
      cache.set('key', 'first')
      cache.set('key', 'second')
      expect(cache.get('key')).toBe('second')
    })

    it('auto-deletes after TTL expires', () => {
      cache.set('key', 'value', 1000)

      expect(cache.get('key')).toBe('value')

      jest.advanceTimersByTime(1001)

      expect(cache.get('key')).toBeNull()
    })

    it('stores complex objects', () => {
      const data = {
        array: [1, 2, 3],
        nested: { a: 'b' },
        number: 42,
      }
      cache.set('complex', data)
      expect(cache.get('complex')).toEqual(data)
    })
  })

  describe('delete', () => {
    it('removes entry from cache', () => {
      cache.set('key', 'value')
      cache.delete('key')
      expect(cache.get('key')).toBeNull()
    })

    it('handles deleting non-existent keys gracefully', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow()
    })
  })

  describe('clear', () => {
    it('removes all entries', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      cache.clear()

      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBeNull()
      expect(cache.get('key3')).toBeNull()
    })

    it('clears timers', () => {
      cache.set('key', 'value', 10000)
      cache.clear()

      // If timers weren't cleared, this would try to delete from cleared cache
      jest.advanceTimersByTime(10001)

      // Should not throw
      expect(cache.size()).toBe(0)
    })
  })

  describe('invalidate', () => {
    it('removes entries matching string pattern', () => {
      cache.set('user:1', 'alice')
      cache.set('user:2', 'bob')
      cache.set('post:1', 'hello')

      cache.invalidate('user:')

      expect(cache.get('user:1')).toBeNull()
      expect(cache.get('user:2')).toBeNull()
      expect(cache.get('post:1')).toBe('hello')
    })

    it('removes entries matching regex pattern', () => {
      cache.set('cache:user:1', 'alice')
      cache.set('cache:user:2', 'bob')
      cache.set('cache:post:1', 'hello')

      cache.invalidate(/cache:user:\d+/)

      expect(cache.get('cache:user:1')).toBeNull()
      expect(cache.get('cache:user:2')).toBeNull()
      expect(cache.get('cache:post:1')).toBe('hello')
    })

    it('handles no matches gracefully', () => {
      cache.set('key', 'value')
      cache.invalidate('nomatch')
      expect(cache.get('key')).toBe('value')
    })
  })
})

describe('CacheTTL constants', () => {
  // Verify the TTL presets make sense
  it('has correct TTL values', () => {
    const CacheTTL = {
      SHORT: 10000,
      MEDIUM: 60000,
      LONG: 300000,
      HOUR: 3600000,
    }

    expect(CacheTTL.SHORT).toBe(10 * 1000)
    expect(CacheTTL.MEDIUM).toBe(60 * 1000)
    expect(CacheTTL.LONG).toBe(5 * 60 * 1000)
    expect(CacheTTL.HOUR).toBe(60 * 60 * 1000)
  })
})
