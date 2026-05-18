import { errorLogging, reportError } from '../error-logging'

// Mock fetch
global.fetch = jest.fn()

describe('error-logging', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    errorLogging.clearRateLimitCache()
    // Enable error logging for tests
    process.env.ENABLE_ERROR_LOGGING = 'true'
    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe('reportError', () => {
    it('reports error and calls API endpoint', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const error = new Error('Test error')
      const errorInfo = { componentStack: 'Test component stack' }

      await reportError(error, errorInfo)

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/errors/report',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('handles API endpoint failure gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const error = new Error('Test error')
      await expect(reportError(error)).resolves.not.toThrow()

      expect(global.fetch).toHaveBeenCalled()
    })

    it('handles network errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const error = new Error('Test error')
      await expect(reportError(error)).resolves.not.toThrow()
    })
  })

  describe('rate limiting', () => {
    it('limits errors per minute', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      })

      const error = new Error('Test error')

      // Report same error 10 times (should succeed)
      for (let i = 0; i < 10; i++) {
        await reportError(error)
      }

      const callCount = (global.fetch as jest.Mock).mock.calls.length

      // Try one more time - should be rate limited
      await reportError(error)

      // Call count should not increase
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(callCount)
    })

    it('resets rate limit after window expires', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      })

      const error = new Error('Test error')

      // Hit rate limit
      for (let i = 0; i < 10; i++) {
        await reportError(error)
      }

      const firstCallCount = (global.fetch as jest.Mock).mock.calls.length

      // Wait for rate limit window to expire (1 minute)
      jest.advanceTimersByTime(61000)

      // Should be able to report again
      await reportError(error)

      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(firstCallCount)
    })

    it('tracks different errors separately', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      })

      const error1 = new Error('Error 1')
      const error2 = new Error('Error 2')

      // Report both errors multiple times
      for (let i = 0; i < 10; i++) {
        await reportError(error1)
        await reportError(error2)
      }

      // Each should be rate limited separately
      const stats = errorLogging.getStats()
      expect(stats.totalTracked).toBe(2)
      expect(stats.openLimitedErrors).toBe(2)
    })
  })

  describe('error report format', () => {
    it('includes all required fields', async () => {
      let capturedBody: string | null = null
      ;(global.fetch as jest.Mock).mockImplementationOnce((_url: string, options: RequestInit) => {
        capturedBody = options.body as string
        return Promise.resolve({ ok: true, status: 200 })
      })

      const error = new Error('Test error')
      error.stack = 'at file.ts:10'
      const errorInfo = { componentStack: 'Component > div' }

      await reportError(error, errorInfo)

      const body = JSON.parse(capturedBody || '{}')
      expect(body).toHaveProperty('message')
      expect(body).toHaveProperty('stack')
      expect(body).toHaveProperty('componentStack')
      expect(body).toHaveProperty('timestamp')
    })
  })

  describe('stats', () => {
    it('provides statistics on tracked errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      })

      const error = new Error('Test error')

      await reportError(error)
      const stats = errorLogging.getStats()

      expect(stats.totalTracked).toBeGreaterThan(0)
      expect(stats).toHaveProperty('openLimitedErrors')
    })

    it('clears rate limit cache', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      })

      const error = new Error('Test error')
      await reportError(error)

      let stats = errorLogging.getStats()
      expect(stats.totalTracked).toBeGreaterThan(0)

      errorLogging.clearRateLimitCache()

      stats = errorLogging.getStats()
      expect(stats.totalTracked).toBe(0)
    })
  })
})
