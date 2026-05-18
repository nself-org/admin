import { NextRequest } from 'next/server'
import { clearAllRateLimits, clearRateLimit, getRateLimitInfo, isRateLimited } from '../rateLimiter'

describe('rateLimiter', () => {
  const createRequest = (ip: string = '127.0.0.1') => {
    return new NextRequest('http://localhost:3021/api/test', {
      headers: {
        'x-forwarded-for': ip,
        'user-agent': 'test-agent',
      },
    })
  }

  beforeEach(() => {
    // Use modern fake timers which also mock Date.now()
    jest.useFakeTimers({ advanceTimers: false })
    // Clear all rate limits between tests
    clearAllRateLimits()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('isRateLimited', () => {
    it('allows first request', () => {
      const request = createRequest()
      const result = isRateLimited(request, 'auth')
      expect(result).toBe(false)
    })

    it('allows requests under limit', () => {
      const request = createRequest()

      for (let i = 0; i < 5; i++) {
        const result = isRateLimited(request, 'auth')
        expect(result).toBe(false)
      }
    })

    it('blocks requests over limit', () => {
      const request = createRequest()

      // Auth limit is 5
      for (let i = 0; i < 5; i++) {
        isRateLimited(request, 'auth')
      }

      const blocked = isRateLimited(request, 'auth')
      expect(blocked).toBe(true)
    })

    it('resets after window expires', () => {
      const request = createRequest()

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        isRateLimited(request, 'auth')
      }

      expect(isRateLimited(request, 'auth')).toBe(true)

      // Advance time past window (15 minutes)
      jest.advanceTimersByTime(16 * 60 * 1000)

      expect(isRateLimited(request, 'auth')).toBe(false)
    })

    it('tracks different IPs separately', () => {
      const request1 = createRequest('192.168.1.1')
      const request2 = createRequest('192.168.1.2')

      // Exhaust limit for first IP
      for (let i = 0; i < 5; i++) {
        isRateLimited(request1, 'auth')
      }

      expect(isRateLimited(request1, 'auth')).toBe(true)
      expect(isRateLimited(request2, 'auth')).toBe(false)
    })

    it('uses different limits for different types', () => {
      const request = createRequest()

      // Auth limit: 5
      // API limit: 100
      // Heavy limit: 10

      expect(isRateLimited(request, 'auth')).toBe(false)
      expect(isRateLimited(request, 'api')).toBe(false)
      expect(isRateLimited(request, 'heavy')).toBe(false)
    })
  })

  describe('getRateLimitInfo', () => {
    it('returns full limit for new client', () => {
      const request = createRequest()
      const info = getRateLimitInfo(request, 'auth')

      expect(info.remaining).toBe(5)
      expect(info.limit).toBe(5)
    })

    it('decrements remaining after requests', () => {
      const request = createRequest()

      isRateLimited(request, 'auth')
      const info = getRateLimitInfo(request, 'auth')

      expect(info.remaining).toBe(4)
      expect(info.limit).toBe(5)
    })

    it('returns 0 remaining when limit exceeded', () => {
      const request = createRequest()

      for (let i = 0; i < 6; i++) {
        isRateLimited(request, 'auth')
      }

      const info = getRateLimitInfo(request, 'auth')
      expect(info.remaining).toBe(0)
    })

    it('resets remaining after window expires', () => {
      const request = createRequest()

      isRateLimited(request, 'auth')
      jest.advanceTimersByTime(16 * 60 * 1000)

      const info = getRateLimitInfo(request, 'auth')
      expect(info.remaining).toBe(5)
    })
  })

  describe('clearRateLimit', () => {
    it('clears rate limit for client', () => {
      const request = createRequest()

      for (let i = 0; i < 5; i++) {
        isRateLimited(request, 'auth')
      }

      expect(isRateLimited(request, 'auth')).toBe(true)

      clearRateLimit(request, 'auth')

      expect(isRateLimited(request, 'auth')).toBe(false)
    })

    it('only clears specified type', () => {
      const request = createRequest()

      isRateLimited(request, 'auth')
      isRateLimited(request, 'api')

      clearRateLimit(request, 'auth')

      const authInfo = getRateLimitInfo(request, 'auth')
      const apiInfo = getRateLimitInfo(request, 'api')

      expect(authInfo.remaining).toBe(5)
      expect(apiInfo.remaining).toBe(99) // Already used 1
    })
  })
})
