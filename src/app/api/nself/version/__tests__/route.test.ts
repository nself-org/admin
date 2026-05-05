jest.mock('child_process')

// Mock util.promisify so we can intercept execAsync calls. The mock fn is stored
// on `global` so each test can drive it without polluting module-scope state.
jest.mock('util', () => {
  const mockFn = jest.fn()
  const g = global as typeof global & { __mockExecAsync: jest.Mock }
  g.__mockExecAsync = mockFn
  return {
    promisify: jest.fn(() => mockFn),
  }
})

jest.mock('@/lib/nself-path', () => ({
  findNselfPath: jest.fn(async () => '/usr/local/bin/nself'),
  getEnhancedPath: jest.fn(() => '/usr/local/bin:/usr/bin:/bin'),
}))

// Import AFTER mocks
import { GET } from '../route'

const getMockExecAsync = () =>
  (global as typeof global & { __mockExecAsync: jest.Mock }).__mockExecAsync

/**
 * Helper: drive GET() with a fake `nself --version` stdout and return the
 * resolved `version` field from the JSON response.
 */
async function versionFor(stdout: string): Promise<string> {
  getMockExecAsync().mockResolvedValueOnce({ stdout, stderr: '' })
  const response = await GET()
  expect(response.status).toBe(200)
  const data = await response.json()
  return data.version as string
}

describe('GET /api/nself/version — version parsing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('preserves the v prefix on a vX.Y.Z release', async () => {
    expect(await versionFor('nself version v1.0.13')).toBe('v1.0.13')
  })

  it('preserves the v prefix on pre-release tags', async () => {
    expect(await versionFor('nself version v1.2.3-rc.1')).toBe('v1.2.3-rc.1')
    expect(await versionFor('nself version v1.0.0-beta.4')).toBe('v1.0.0-beta.4')
    expect(await versionFor('nself version v2.0.0-alpha.1+sha.abc')).toBe(
      'v2.0.0-alpha.1+sha.abc',
    )
  })

  it('preserves the v prefix when output has trailing newline / whitespace', async () => {
    expect(await versionFor('nself version v1.0.13\n')).toBe('v1.0.13')
    expect(await versionFor('  nself version v0.5.0  \n')).toBe('v0.5.0')
  })

  it('preserves the v prefix when output is just the version', async () => {
    expect(await versionFor('v1.0.13')).toBe('v1.0.13')
    expect(await versionFor('v3.10.100-rc.42')).toBe('v3.10.100-rc.42')
  })

  it('falls back to bare semver without v prefix (legacy CLI)', async () => {
    expect(await versionFor('nself version 0.4.4')).toBe('0.4.4')
    expect(await versionFor('nself version 1.2.3-rc.1')).toBe('1.2.3-rc.1')
  })

  it('returns trimmed raw stdout when no version pattern matches', async () => {
    expect(await versionFor('  unknown garbage  ')).toBe('unknown garbage')
  })

  it('handles multi-line output and picks the version line', async () => {
    const stdout = 'nself CLI\nnself version v1.0.13\nbuilt 2026-04-28\n'
    expect(await versionFor(stdout)).toBe('v1.0.13')
  })
})

describe('GET /api/nself/version — response shape', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns version + path on success', async () => {
    getMockExecAsync().mockResolvedValueOnce({
      stdout: 'nself version v1.0.13\n',
      stderr: '',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.version).toBe('v1.0.13')
    expect(data.path).toBe('/usr/local/bin/nself')
  })

  it('returns 404 when CLI is missing', async () => {
    getMockExecAsync().mockRejectedValueOnce(new Error('command not found'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('nself CLI not found')
    expect(data.details).toBe('command not found')
  })
})
