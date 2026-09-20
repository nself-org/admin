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

// The in-stack dependency probes are unit-tested in
// src/lib/__tests__/health-dependencies.test.ts. Here they are mocked so these
// tests cover what the route DOES with the results — in particular that
// outbound connectivity never reaches `status`.
jest.mock('@/lib/health-dependencies', () => ({
  checkPostgres: jest.fn(),
  checkHasura: jest.fn(),
  checkOutbound: jest.fn(),
}))

// Import AFTER mocks are set up
import { checkHasura, checkOutbound, checkPostgres } from '@/lib/health-dependencies'
import { GET, HEAD } from '../route'

// Helper to get the mock
const getMockExecAsync = () =>
  (global as typeof global & { __mockExecAsync: jest.Mock }).__mockExecAsync

const reachable = (detail = 'connected') => ({ ok: true, configured: true, detail, latencyMs: 1 })
const unreachable = (detail = 'connection refused') => ({
  ok: false,
  configured: true,
  detail,
  latencyMs: 1,
})

/** docker + nself CLI probes succeed. */
const mockAllShellChecksPass = () => {
  getMockExecAsync().mockImplementation((cmd: string) => {
    if (cmd.includes('docker version')) {
      return Promise.resolve({ stdout: 'Docker version 20.10.0', stderr: '' })
    }
    if (cmd.includes('nself')) {
      return Promise.resolve({ stdout: 'v0.5.0', stderr: '' })
    }
    return Promise.resolve({ stdout: 'OK', stderr: '' })
  })
}

/** Filesystem writable and /proc readable with plenty of memory free. */
const mockFilesystemAndMemoryOk = () => {
  ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)
  ;(fs.unlink as jest.Mock).mockResolvedValue(undefined)
  ;(fs.access as jest.Mock).mockResolvedValue(undefined)
  ;(fs.readFile as jest.Mock).mockResolvedValue(
    'MemTotal: 8000000 kB\nMemAvailable: 4000000 kB\ncpu 100 100 100 100'
  )
}

/** Default: both in-stack dependencies up, no outbound probe configured. */
const mockDependenciesHealthy = () => {
  ;(checkPostgres as jest.Mock).mockResolvedValue(reachable('connected to postgres:5432'))
  ;(checkHasura as jest.Mock).mockResolvedValue(
    reachable('http://hasura:8080/healthz returned 200')
  )
  ;(checkOutbound as jest.Mock).mockResolvedValue('not-checked')
}

// Helper: minimal Request with no query params (default GET behaviour)
const makeRequest = (url = 'http://localhost:3021/api/health') => new Request(url)

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDependenciesHealthy()
  })

  it('returns healthy status when all checks pass', async () => {
    // Mock execAsync to return success for different commands
    getMockExecAsync().mockImplementation((cmd: string) => {
      if (cmd.includes('docker version')) {
        return Promise.resolve({ stdout: 'Docker version 20.10.0', stderr: '' })
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

  // ── Offline / air-gapped operation ────────────────────────────────────────
  // nSelf is self-hosted and explicitly supports isolated networks (the Bundle
  // License carries a documented 7-day offline window). The health endpoint
  // previously pinged google.com, so every air-gapped install reported itself
  // permanently "degraded" with no actual fault. Regression guard:

  it('stays healthy with no outbound internet when postgres and hasura are reachable', async () => {
    mockAllShellChecksPass()
    mockFilesystemAndMemoryOk()
    // In-stack dependencies up; the outbound probe is configured and failing.
    ;(checkOutbound as jest.Mock).mockResolvedValue('unreachable')

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.checks.postgres).toBe(true)
    expect(data.checks.hasura).toBe(true)
    // Reported, but purely informational — it must not touch overall status.
    expect(data.outbound).toBe('unreachable')
  })

  it('stays healthy when no in-stack dependency is configured at all', async () => {
    // Standalone admin (CI, bare `docker run`, wizard before a stack exists):
    // an absent dependency is not a dependency, so it is not a fault.
    mockAllShellChecksPass()
    mockFilesystemAndMemoryOk()
    ;(checkPostgres as jest.Mock).mockResolvedValue({
      ok: true,
      configured: false,
      detail: 'not configured (no DATABASE_URL or POSTGRES_HOST)',
    })
    ;(checkHasura as jest.Mock).mockResolvedValue({
      ok: true,
      configured: false,
      detail: 'not configured (no HASURA_GRAPHQL_ENDPOINT)',
    })

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.dependencies.postgres.configured).toBe(false)
    expect(data.dependencies.hasura.configured).toBe(false)
  })

  it('degrades when a configured in-stack dependency is unreachable', async () => {
    mockAllShellChecksPass()
    mockFilesystemAndMemoryOk()
    ;(checkPostgres as jest.Mock).mockResolvedValue(unreachable('postgres:5432 — ECONNREFUSED'))

    const response = await GET(makeRequest())
    const data = await response.json()

    // Still 200: only docker/filesystem are fatal. But honestly degraded.
    expect(response.status).toBe(200)
    expect(data.status).toBe('degraded')
    expect(data.checks.postgres).toBe(false)
    expect(data.checks.hasura).toBe(true)
  })

  it('never shells out to ping', async () => {
    // ICMP is blocked or `ping` is absent in most container and CI images, so
    // it reports "down" where connectivity is fine (observed in E2E golden-path
    // run 35532071307 on a GitHub-hosted runner).
    mockAllShellChecksPass()
    mockFilesystemAndMemoryOk()

    await GET(makeRequest())

    const commands = getMockExecAsync().mock.calls.map((call: unknown[]) => String(call[0]))
    expect(commands.some((cmd: string) => cmd.includes('ping'))).toBe(false)
  })

  it('exposes the dependency checks as named services for ?all=true', async () => {
    // The health dashboard consumes this shape. checksToServiceHealthList maps
    // check keys through a label map, so new checks must arrive labelled.
    mockAllShellChecksPass()
    mockFilesystemAndMemoryOk()
    ;(checkPostgres as jest.Mock).mockResolvedValue(unreachable('postgres:5432 - ECONNREFUSED'))

    const response = await GET(makeRequest('http://localhost:3021/api/health?all=true'))
    const data = await response.json()

    expect(data.overall).toBe('degraded')
    const byName = Object.fromEntries(
      data.services.map((s: { name: string; status: string }) => [s.name, s.status])
    )
    expect(byName['PostgreSQL']).toBe('unhealthy')
    expect(byName['Hasura']).toBe('healthy')
    expect(byName['Network']).toBeUndefined()
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
