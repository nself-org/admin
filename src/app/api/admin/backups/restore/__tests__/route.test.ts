import { NextRequest } from 'next/server'

// Mock child_process before importing the route so the module picks up the mock.
const mockExecFileSync = jest.fn()
jest.mock('child_process', () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...args),
}))

// Bypass auth for unit tests.
jest.mock('@/lib/require-auth', () => ({
  requireAuth: jest.fn().mockResolvedValue(null),
}))

import { POST } from '../route'

/** Build a minimal NextRequest with a JSON body. */
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/backups/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/backups/restore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Valid filenames ───────────────────────────────────────────────────────

  it('calls execFileSync with argv array for a valid filename', async () => {
    mockExecFileSync.mockReturnValue('Restored successfully\n')

    const res = await POST(makeRequest({ filename: 'backup-2026-05-15.sql.gz' }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.output).toBe('Restored successfully')

    expect(mockExecFileSync).toHaveBeenCalledTimes(1)
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'nself',
      ['backup', 'restore', '--', 'backup-2026-05-15.sql.gz'],
      expect.objectContaining({ encoding: 'utf-8' }),
    )
  })

  it('accepts filenames with underscores and digits', async () => {
    mockExecFileSync.mockReturnValue('ok\n')

    const res = await POST(makeRequest({ filename: 'nself_backup_1234567890.dump' }))

    expect(res.status).toBe(200)
    expect(mockExecFileSync).toHaveBeenCalledTimes(1)
    const [_bin, argv] = mockExecFileSync.mock.calls[0] as [string, string[]]
    expect(argv[3]).toBe('nself_backup_1234567890.dump')
  })

  // ── Invalid / malicious filenames — HTTP 400, execFileSync NOT called ────

  const maliciousFilenames = [
    '; rm -rf /',
    '$(id)',
    '`id`',
    '../../etc/passwd',
    '../sibling',
    '.hidden',
    'file with spaces',
    'file\nnewline',
    '--flag-injection',
    'back\\slash',
    'file/slash',
    'file\x00null',
  ]

  it.each(maliciousFilenames)(
    'rejects malicious filename %j with HTTP 400',
    async (filename) => {
      const res = await POST(makeRequest({ filename }))
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('Invalid filename')
      expect(mockExecFileSync).not.toHaveBeenCalled()
    },
  )

  // ── Missing / empty filename ──────────────────────────────────────────────

  it('returns 400 when filename is missing', async () => {
    const res = await POST(makeRequest({}))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('filename is required')
    expect(mockExecFileSync).not.toHaveBeenCalled()
  })

  it('returns 400 when filename is empty string', async () => {
    const res = await POST(makeRequest({ filename: '' }))
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('filename is required')
    expect(mockExecFileSync).not.toHaveBeenCalled()
  })

  // ── Invalid JSON body ─────────────────────────────────────────────────────

  it('returns 400 for malformed JSON', async () => {
    const req = new NextRequest('http://localhost/api/admin/backups/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Invalid JSON body')
    expect(mockExecFileSync).not.toHaveBeenCalled()
  })

  // ── CLI failure propagation ───────────────────────────────────────────────

  it('returns 500 when execFileSync throws an Error', async () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('nself: backup not found')
    })

    const res = await POST(makeRequest({ filename: 'backup-2026-01-01.sql.gz' }))
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toContain('nself: backup not found')
  })

  it('returns 500 and surfaces stderr when execFileSync throws with stderr', async () => {
    mockExecFileSync.mockImplementation(() => {
      const err = Object.assign(new Error('Command failed'), {
        stderr: 'fatal: backup file missing',
      })
      throw err
    })

    const res = await POST(makeRequest({ filename: 'backup-2026-01-01.sql.gz' }))
    const data = await res.json()

    expect(res.status).toBe(500)
    // Error.message is preferred; stderr surfaces as fallback — either way non-empty
    expect(data.error).toBeTruthy()
  })
})
