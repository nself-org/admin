/**
 * Tests for /api/control-plane — control-plane nAdmin route.
 *
 * CR-A: validates auth guard, input validation, and pure execFile passthrough.
 * Zero TS control-plane logic is reimplemented here — all verification is about
 * correct CLI arg construction and response mapping.
 */

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

// Mock execFile at the util level since route.ts uses promisify(execFile)
const mockExecFile = jest.fn()
jest.mock('child_process', () => ({
  execFile: (...args: unknown[]) => mockExecFile(...args),
}))

// promisify wraps the last callback arg — return a real async function
jest.mock('util', () => ({
  promisify:
    (fn: (...args: unknown[]) => void) =>
    (...args: unknown[]) =>
      new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        // inject callback as last arg
        fn(...args, (err: Error | null, stdout: string, stderr: string) => {
          if (err) {
            const enhanced = err as Error & { stdout?: string; stderr?: string }
            enhanced.stdout = stdout
            enhanced.stderr = stderr
            reject(enhanced)
          } else {
            resolve({ stdout, stderr })
          }
        })
      }),
}))

import { requireAuth } from '@/lib/require-auth'
import { GET, POST } from '../route'

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>

function makeGETRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3021/api/control-plane')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new NextRequest(url)
}

function makePOSTRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3021/api/control-plane', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setExecSuccess(stdout: string, stderr = ''): void {
  mockExecFile.mockImplementation(
    (_bin: string, _args: string[], _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
      cb(null, stdout, stderr)
    },
  )
}

function setExecError(message: string, stdout = '', stderr = ''): void {
  mockExecFile.mockImplementation(
    (_bin: string, _args: string[], _opts: unknown, cb: (err: Error, stdout: string, stderr: string) => void) => {
      cb(Object.assign(new Error(message), { stdout, stderr }), stdout, stderr)
    },
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
    // Verify execFile was called with correct nself args
    expect(mockExecFile).toHaveBeenCalledWith(
      'nself',
      expect.arrayContaining(['env', 'target', 'probe', '--json']),
      expect.any(Object),
      expect.any(Function),
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
    mockRequireAuth.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    )

    const res = await POST(makePOSTRequest({ action: 'add', name: 'prod', host: '1.2.3.4', role: 'primary' }))
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

    const res = await POST(makePOSTRequest({ action: 'add', name: 'prod', host: '5.5.5.5', role: 'primary' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.action).toBe('add')
    expect(json.name).toBe('prod')
    // Verify CLI args
    expect(mockExecFile).toHaveBeenCalledWith(
      'nself',
      ['env', 'target', 'add', 'prod', '--host', '5.5.5.5', '--role', 'primary'],
      expect.any(Object),
      expect.any(Function),
    )
  })

  it('passes optional sshUser and sshKeyPath to CLI', async () => {
    setExecSuccess('OK')

    await POST(makePOSTRequest({
      action: 'add',
      name: 'staging',
      host: '1.2.3.4',
      role: 'secondary',
      sshUser: 'deploy',
      sshKeyPath: '/home/user/.ssh/id_rsa',
    }))

    expect(mockExecFile).toHaveBeenCalledWith(
      'nself',
      ['env', 'target', 'add', 'staging', '--host', '1.2.3.4', '--role', 'secondary', '--ssh-user', 'deploy', '--ssh-key', '/home/user/.ssh/id_rsa'],
      expect.any(Object),
      expect.any(Function),
    )
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makePOSTRequest({ action: 'add', name: 'prod' }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('returns 400 for injection attempt in host field', async () => {
    const res = await POST(makePOSTRequest({
      action: 'add',
      name: 'prod',
      host: '$(rm -rf /)',
      role: 'primary',
    }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('rejects path traversal in sshKeyPath', async () => {
    const res = await POST(makePOSTRequest({
      action: 'add',
      name: 'prod',
      host: '1.2.3.4',
      role: 'primary',
      sshKeyPath: '../../etc/passwd',
    }))
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
    expect(mockExecFile).toHaveBeenCalledWith(
      'nself',
      ['env', 'target', 'remove', 'prod'],
      expect.any(Object),
      expect.any(Function),
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
