import fs from 'fs/promises'

jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  unlink: jest.fn(),
  access: jest.fn(),
  readFile: jest.fn(),
  constants: {
    R_OK: 4,
    W_OK: 2,
  },
}))
jest.mock('child_process')

// Create the mock inside the factory and store it on global
jest.mock('util', () => {
  const mockFn = jest.fn()
  // Store mock on global so we can access it in tests
  const g = global as typeof global & { __mockExecAsync: jest.Mock }
  g.__mockExecAsync = mockFn
  return {
    promisify: jest.fn(() => mockFn),
  }
})

jest.mock('@/lib/nself-path', () => ({
  getEnhancedPath: jest.fn(() => '/usr/bin:/bin'),
}))

// Import AFTER mocks are set up
import { GET, HEAD } from '../route'

// Helper to get the mock
const getMockExecAsync = () =>
  (global as typeof global & { __mockExecAsync: jest.Mock }).__mockExecAsync

// Helper: minimal Request with no query params (default GET behaviour)
const makeRequest = (url = 'http://localhost:3021/api/health') => new Request(url)

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns healthy status when all checks pass', async () => {
    // Mock execAsync to return success for different commands
    getMockExecAsync().mockImplementation((cmd: string) => {
      if (cmd.includes('docker version')) {
        return Promise.resolve({ stdout: 'Docker version 20.10.0', stderr: '' })
      } else if (cmd.includes('ping')) {
        return Promise.resolve({ stdout: 'PING google.com', stderr: '' })
      } else if (cmd.includes('nself')) {
        return Promise.resolve({ stdout: 'v0.5.0', stderr: '' })
      }
      return Promise.resolve({ stdout: 'OK', stderr: '' })
    })
    ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)
    ;(fs.unlink as jest.Mock).mockResolvedValue(undefined)
    ;(fs.access as jest.Mock).mockResolvedValue(undefined)
    ;(fs.readFile as jest.Mock).mockResolvedValue(
      'MemTotal: 8000000 kB\nMemAvailable: 4000000 kB\ncpu 100 100 100 100'
    )

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.version).toBeTruthy()
    expect(data.checks.docker).toBe(true)
    expect(data.checks.filesystem).toBe(true)
  })

  it('returns unhealthy status when Docker is down', async () => {
    // Mock execAsync to throw error for docker command
    getMockExecAsync().mockRejectedValue(new Error('Docker not running'))
    ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)
    ;(fs.unlink as jest.Mock).mockResolvedValue(undefined)
    ;(fs.access as jest.Mock).mockResolvedValue(undefined)
    ;(fs.readFile as jest.Mock).mockResolvedValue(
      'MemTotal: 8000000 kB\nMemAvailable: 4000000 kB\ncpu 100 100 100 100'
    )

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.checks.docker).toBe(false)
  })

  it('returns unhealthy status when filesystem is inaccessible', async () => {
    getMockExecAsync().mockResolvedValue({
      stdout: 'Docker version 20.10.0',
      stderr: '',
    })
    ;(fs.writeFile as jest.Mock).mockRejectedValue(new Error('Permission denied'))
    ;(fs.readFile as jest.Mock).mockResolvedValue(
      'MemTotal: 8000000 kB\nMemAvailable: 4000000 kB\ncpu 100 100 100 100'
    )

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.checks.filesystem).toBe(false)
  })

  it('includes resource usage in response', async () => {
    getMockExecAsync().mockResolvedValue({ stdout: 'OK', stderr: '' })
    ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)
    ;(fs.unlink as jest.Mock).mockResolvedValue(undefined)
    ;(fs.access as jest.Mock).mockResolvedValue(undefined)
    ;(fs.readFile as jest.Mock).mockResolvedValue(
      'MemTotal: 8000000 kB\nMemAvailable: 4000000 kB\ncpu 100 100 100 100'
    )

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.resources).toBeDefined()
    expect(data.resources.memory).toBeDefined()
    expect(data.resources.cpu).toBeDefined()
  })

  it('includes uptime in response', async () => {
    getMockExecAsync().mockResolvedValue({ stdout: 'OK', stderr: '' })
    ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)
    ;(fs.unlink as jest.Mock).mockResolvedValue(undefined)
    ;(fs.access as jest.Mock).mockResolvedValue(undefined)
    ;(fs.readFile as jest.Mock).mockResolvedValue(
      'MemTotal: 8000000 kB\nMemAvailable: 4000000 kB\ncpu 100 100 100 100'
    )

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.uptime).toBeGreaterThanOrEqual(0)
    expect(data.uptimeFormatted).toBeTruthy()
  })
})

describe('HEAD /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 200 when Docker is accessible', async () => {
    getMockExecAsync().mockResolvedValue({
      stdout: 'Docker version 20.10.0',
      stderr: '',
    })

    const response = await HEAD()

    expect(response.status).toBe(200)
  })

  it('returns 503 when Docker is not accessible', async () => {
    getMockExecAsync().mockRejectedValue(new Error('Docker not running'))

    const response = await HEAD()

    expect(response.status).toBe(503)
  })
})
