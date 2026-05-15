/**
 * Unit tests for the environments API route.
 *
 * Key security invariants verified:
 *   1. Shell-injection payload (e.g. "$(id)") is rejected with HTTP 400.
 *   2. execFile is NEVER called when validation fails — confirmed via mock.
 *   3. GET returns 405 (method not allowed).
 *   4. Valid payloads call execFile with explicit argv arrays (no shell string).
 */

import { NextRequest } from 'next/server'

// ── Mock infrastructure ───────────────────────────────────────────────────────

// Silence audit-log file writes during tests
jest.mock('@/lib/audit-file', () => ({
  appendAuditFile: jest.fn(),
  extractSourceIp: jest.fn().mockReturnValue('127.0.0.1'),
}))

// Provide a stable project path
jest.mock('@/lib/paths', () => ({
  getProjectPath: jest.fn().mockReturnValue('/tmp/test-project'),
}))

// Auth always passes in unit tests
jest.mock('@/lib/require-auth', () => ({
  requireAuth: jest.fn().mockResolvedValue(null),
}))

// Mock execFile — track calls; resolve by default
const mockExecFile = jest.fn()
jest.mock('child_process', () => ({
  execFile: (...args: unknown[]) => {
    // util.promisify wraps with (error, stdout, stderr) callback
    const cb = args[args.length - 1] as (err: null, result: { stdout: string; stderr: string }) => void
    // Forward to our mockExecFile for assertions, then resolve
    mockExecFile(...args)
    cb(null, { stdout: '', stderr: '' })
  },
}))

// ── Import after mocks are established ────────────────────────────────────────
import { GET, POST } from './route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3021/api/deployment/environments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockExecFile.mockClear()
})

describe('GET /api/deployment/environments', () => {
  it('returns 405 — mutations must use POST', async () => {
    const response = await GET()
    expect(response.status).toBe(405)
    const body = await response.json()
    expect(body.error).toBe('method_not_allowed')
  })
})

describe('POST /api/deployment/environments — shell injection blocked', () => {
  it('rejects environment="$(id)" with HTTP 400 and no shell invocation', async () => {
    const req = makeRequest({ action: 'create', environment: '$(id)' })
    const response = await POST(req)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('invalid_input')

    // The critical assertion: execFile must never have been called
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('rejects environment with semicolon injection', async () => {
    const req = makeRequest({ action: 'delete', environment: 'prod;rm -rf /' })
    const response = await POST(req)
    expect(response.status).toBe(400)
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('rejects environment with backtick injection', async () => {
    const req = makeRequest({ action: 'create', environment: '`whoami`' })
    const response = await POST(req)
    expect(response.status).toBe(400)
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('rejects options.compare with injection payload', async () => {
    const req = makeRequest({
      action: 'diff',
      environment: 'staging',
      options: { compare: '$(cat /etc/passwd)' },
    })
    const response = await POST(req)
    expect(response.status).toBe(400)
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('rejects unknown template names', async () => {
    const req = makeRequest({
      action: 'create',
      environment: 'myenv',
      options: { template: '../../evil' },
    })
    const response = await POST(req)
    expect(response.status).toBe(400)
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('rejects unknown action values', async () => {
    const req = makeRequest({ action: 'switch', environment: 'staging' })
    const response = await POST(req)
    expect(response.status).toBe(400)
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  // Argument-injection: leading-hyphen values would be parsed as CLI flags
  it('rejects environment="--help" (leading-hyphen argument injection) with HTTP 400 and no execFile call', async () => {
    const req = makeRequest({ action: 'create', environment: '--help' })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('invalid_input')
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('rejects environment="-rf" (single-dash flag injection) with HTTP 400 and no execFile call', async () => {
    const req = makeRequest({ action: 'delete', environment: '-rf' })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('invalid_input')
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('rejects environment with embedded newline (\\n) with HTTP 400 and no execFile call', async () => {
    const req = makeRequest({ action: 'create', environment: 'env\nname' })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('invalid_input')
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('rejects environment with null byte (\\0) with HTTP 400 and no execFile call', async () => {
    const req = makeRequest({ action: 'create', environment: 'env\x00name' })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('invalid_input')
    expect(mockExecFile).not.toHaveBeenCalled()
  })

  it('rejects environment with path-traversal pattern ("../evil") with HTTP 400 and no execFile call', async () => {
    const req = makeRequest({ action: 'create', environment: '../evil' })
    const response = await POST(req)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('invalid_input')
    expect(mockExecFile).not.toHaveBeenCalled()
  })
})

describe('POST /api/deployment/environments — valid payloads', () => {
  it('calls execFile with explicit argv for env list', async () => {
    const req = makeRequest({ action: 'list' })
    const response = await POST(req)
    expect(response.status).toBe(200)
    // execFile first arg = 'nself', second = ['env', 'list', ...]
    expect(mockExecFile).toHaveBeenCalledWith(
      'nself',
      ['env', 'list'],
      expect.objectContaining({ cwd: '/tmp/test-project' }),
      expect.any(Function),
    )
  })

  it('calls execFile with explicit argv for env create (-- separator before positional)', async () => {
    const req = makeRequest({ action: 'create', environment: 'staging' })
    await POST(req)
    expect(mockExecFile).toHaveBeenCalledWith(
      'nself',
      ['env', 'create', '--', 'staging'],
      expect.any(Object),
      expect.any(Function),
    )
  })

  it('calls execFile with explicit argv for env delete --force (-- separator before positional)', async () => {
    const req = makeRequest({ action: 'delete', environment: 'staging', options: { force: true } })
    await POST(req)
    expect(mockExecFile).toHaveBeenCalledWith(
      'nself',
      ['env', 'delete', '--', 'staging', '--force'],
      expect.any(Object),
      expect.any(Function),
    )
  })

  it('calls execFile with explicit argv for env diff (-- separator before positionals)', async () => {
    const req = makeRequest({
      action: 'diff',
      environment: 'staging',
      options: { compare: 'prod' },
    })
    await POST(req)
    expect(mockExecFile).toHaveBeenCalledWith(
      'nself',
      ['env', 'diff', '--', 'staging', 'prod'],
      expect.any(Object),
      expect.any(Function),
    )
  })

  it('accepts valid template names: flag pair precedes --, env positional follows --', async () => {
    const req = makeRequest({
      action: 'create',
      environment: 'myenv',
      options: { template: 'minimal' },
    })
    await POST(req)
    // Correct POSIX order: option flags before '--', user-controlled positional after '--'
    expect(mockExecFile).toHaveBeenCalledWith(
      'nself',
      ['env', 'create', '--template', 'minimal', '--', 'myenv'],
      expect.any(Object),
      expect.any(Function),
    )
  })

  it('create with template produces argv: [env,create,--template,<tpl>,--,<env>] (exact order assertion)', async () => {
    const req = makeRequest({
      action: 'create',
      environment: 'myenv',
      options: { template: 'minimal' },
    })
    await POST(req)
    const [, argv] = mockExecFile.mock.calls[0] as [string, string[]]
    expect(argv).toEqual(['env', 'create', '--template', 'minimal', '--', 'myenv'])
  })
})
