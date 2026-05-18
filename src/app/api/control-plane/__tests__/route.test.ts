/**
 * Tests for /api/control-plane — control-plane nAdmin route.
 *
 * CR-A: validates auth guard, input validation, and pure execFile passthrough.
 * Zero TS control-plane logic is reimplemented here — all verification is about
 * correct CLI arg construction and response mapping.
 *
 * Mocking strategy:
 *   child_process.execFile is mocked with a callback-style jest.fn() that also has
 *   util.promisify.custom set to a jest.fn() returning a promise. This ensures that
 *   util.promisify(execFile) returns the custom mock (which resolves { stdout, stderr })
 *   rather than the default promisify wrapper (which resolves only stdout as a string).
 *
 *   NextRequest must be constructed with a string URL (not a URL object) — in jsdom,
 *   NextRequest.url is undefined when constructed with a URL object, causing the route
 *   to throw a non-Error when it calls new URL(request.url).
 */

import { execFile } from 'child_process'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/lib/nself-path', () => ({
  getEnhancedPath: jest.fn(() => '/usr/local/bin:/usr/bin:/bin'),
}))

jest.mock('@/lib/paths', () => ({
  getProjectPath: jest.fn(() => '/tmp/test-project'),
}))

jest.mock('@/lib/require-auth', () => ({
  requireAuth: jest.fn(),
}))

// Mock child_process.execFile with a callback-style stub PLUS util.promisify.custom.
//
// Background: Node's real execFile has util.promisify.custom set, so promisify(execFile)
// returns a function that resolves { stdout, stderr }. A plain jest.fn() lacks this
// symbol, so promisify(jest.fn()) resolves only stdout (a string), breaking
// the route's const { stdout, stderr } = await execFileAsync(...) destructuring.
//
// Solution: attach a custom jest.fn() via the util.promisify.custom symbol so that
// promisify(execFile) returns the custom mock, which we control to resolve { stdout, stderr }.
jest.mock('child_process', () => {
  const { promisify } = jest.requireActual<typeof import('util')>('util')
  // The custom mock that util.promisify will use when wrapping execFileMock.
  // Its implementation is set per-test via setExecSuccess / setExecError.
  const execFileCustom = jest.fn<
    Promise<{ stdout: string; stderr: string }>,
    [string, string[], object]
  >()

  const execFileMock = jest.fn()
  // Attach the custom symbol so promisify(execFileMock) returns execFileCustom.
  ;(execFileMock as unknown as Record<symbol, unknown>)[promisify.custom] = execFileCustom

  return { execFile: execFileMock, __execFileCustom: execFileCustom }
})

import { requireAuth } from '@/lib/require-auth'
import { GET, POST } from '../route'

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>

// Access both the outer mock (for call-count assertions) and the custom
// promisify target (for resolving promises).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockExecFile = execFile as jest.MockedFunction<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockExecFileCustom = (jest.requireMock('child_process') as any)
  .__execFileCustom as jest.MockedFunction<() => Promise<{ stdout: string; stderr: string }>>

function makeGETRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3021/api/control-plane')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  // Pass url.toString() (not the URL object) — NextRequest.url is undefined in
  // jsdom when constructed with a URL object, causing the route to throw a non-Error
  // when it calls new URL(request.url).
  return new NextRequest(url.toString())
}

function makePOSTRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3021/api/control-plane', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * Configure execFile mock to resolve successfully.
 * Sets both the outer mock (call-count tracking) and the custom promisify target.
 */
function setExecSuccess(stdout: string, stderr = ''): void {
  mockExecFileCustom.mockResolvedValue({ stdout, stderr })
  // Also make the outer execFile call the custom implementation (for call-count assertions).
  mockExecFile.mockImplementation(
    (
      _bin: string,
      _args: string[],
      _opts: object,
      callback: (err: null, stdout: string, stderr: string) => void
    ) => {
      callback(null, stdout, stderr)
    }
  )
}

/**
 * Configure execFile mock to reject with an error.
 */
function setExecError(message: string, stdout = '', stderr = ''): void {
  const err = Object.assign(new Error(message), { stdout, stderr })
  mockExecFileCustom.mockRejectedValue(err)
  mockExecFile.mockImplementation(
    (
      _bin: string,
      _args: string[],
      _opts: object,
      callback: (err: Error, stdout: string, stderr: string) => void
    ) => {
      callback(err, stdout, stderr)
    }
  )
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe('GET /api/control-plane', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue(null) // no auth required on GET
  })

  it('returns 200 with parsed inventory on default list action', async () => {
    const inventory = { servers: [{ name: 'prod', role: 'primary', capability: 'manage' }] }
    setExecSuccess(JSON.stringify(inventory))

    const res = await GET(makeGETRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.action).toBe('list')
    expect(json.data).toEqual(inventory)
  })

  it('passes action=probe to CLI correctly', async () => {
    const probeResult = { servers: [{ name: 'staging', capability: 'read-only' }] }
    setExecSuccess(JSON.stringify(probeResult))

    const res = await GET(makeGETRequest({ action: 'probe' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.action).toBe('probe')
    // Verify execFileAsync (the promisified version = execFileCustom) was called with correct nself args.
    // The promisify.custom mock means promisify(execFile) === execFileCustom directly —
    // execFileCustom is what the route actually invokes (no callback arg).
    expect(mockExecFileCustom).toHaveBeenCalledWith(
      'nself',
      expect.arrayContaining(['env', 'target', 'probe', '--json']),
      expect.any(Object)
    )
  })

  it('returns 400 for unknown action', async () => {
    const res = await GET(makeGETRequest({ action: 'unknown' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('returns 400 for invalid env name (injection attempt)', async () => {
    const res = await GET(makeGETRequest({ env: '../etc/passwd' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('returns 502 when CLI outputs non-JSON', async () => {
    setExecSuccess('Error: nself not configured')

    const res = await GET(makeGETRequest())
    const json = await res.json()

    expect(res.status).toBe(502)
    expect(json.success).toBe(false)
    expect(json.error).toContain('non-JSON')
  })

  it('returns 500 on CLI exec failure', async () => {
    setExecError('command not found: nself')

    const res = await GET(makeGETRequest())
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.success).toBe(false)
  })
})

// ── POST tests — auth guard ───────────────────────────────────────────────────

describe('POST /api/control-plane — auth', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    const { NextResponse } = await import('next/server')
    mockRequireAuth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const res = await POST(
      makePOSTRequest({ action: 'add', name: 'prod', host: '1.2.3.4', role: 'primary' })
    )
    expect(res.status).toBe(401)
  })
})

// ── POST tests — add ──────────────────────────────────────────────────────────

describe('POST /api/control-plane — add', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue(null)
  })

  it('returns 200 when add succeeds', async () => {
    setExecSuccess('Server prod added successfully')

    const res = await POST(
      makePOSTRequest({ action: 'add', name: 'prod', host: '5.5.5.5', role: 'primary' })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.action).toBe('add')
    expect(json.name).toBe('prod')
    // Verify CLI args via the promisified mock (execFileCustom — no callback arg).
    expect(mockExecFileCustom).toHaveBeenCalledWith(
      'nself',
      ['env', 'target', 'add', 'prod', '--host', '5.5.5.5', '--role', 'primary'],
      expect.any(Object)
    )
  })

  it('passes optional sshUser and sshKeyPath to CLI', async () => {
    setExecSuccess('OK')

    await POST(
      makePOSTRequest({
        action: 'add',
        name: 'staging',
        host: '1.2.3.4',
        role: 'secondary',
        sshUser: 'deploy',
        sshKeyPath: '/home/user/.ssh/id_rsa',
      })
    )

    expect(mockExecFileCustom).toHaveBeenCalledWith(
      'nself',
      [
        'env',
        'target',
        'add',
        'staging',
        '--host',
        '1.2.3.4',
        '--role',
        'secondary',
        '--ssh-user',
        'deploy',
        '--ssh-key',
        '/home/user/.ssh/id_rsa',
      ],
      expect.any(Object)
    )
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makePOSTRequest({ action: 'add', name: 'prod' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('returns 400 for injection attempt in host field', async () => {
    const res = await POST(
      makePOSTRequest({
        action: 'add',
        name: 'prod',
        host: '$(rm -rf /)',
        role: 'primary',
      })
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('rejects path traversal in sshKeyPath', async () => {
    const res = await POST(
      makePOSTRequest({
        action: 'add',
        name: 'prod',
        host: '1.2.3.4',
        role: 'primary',
        sshKeyPath: '../../etc/passwd',
      })
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })
})

// ── POST tests — remove ───────────────────────────────────────────────────────

describe('POST /api/control-plane — remove', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue(null)
  })

  it('returns 200 when remove succeeds', async () => {
    setExecSuccess('Server prod removed')

    const res = await POST(makePOSTRequest({ action: 'remove', name: 'prod' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.action).toBe('remove')
    expect(mockExecFileCustom).toHaveBeenCalledWith(
      'nself',
      ['env', 'target', 'remove', 'prod'],
      expect.any(Object)
    )
  })

  it('returns 400 for invalid name on remove', async () => {
    const res = await POST(makePOSTRequest({ action: 'remove', name: '../../etc/passwd' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('returns 400 for unknown action', async () => {
    const res = await POST(makePOSTRequest({ action: 'unknown' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })
})
