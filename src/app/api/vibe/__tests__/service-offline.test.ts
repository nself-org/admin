/**
 * Integration tests: vibe routes return 503 with X-Service-Required: vibe_api
 * when vibe_api CS_2 is not running.
 *
 * These tests verify the auth-bypass fix (T13): no stub data is ever returned
 * when the upstream service is absent.
 */

import { NextRequest } from 'next/server'

// Mock require-auth so we can test the service-offline path without a real session.
jest.mock('@/lib/require-auth', () => ({
  requireAuth: jest.fn().mockResolvedValue(null),
}))
jest.mock('@/lib/auth-db', () => ({
  validateSessionToken: jest.fn().mockResolvedValue(true),
}))
jest.mock('@/lib/database', () => ({
  hasAdminPassword: jest.fn().mockResolvedValue(true),
  getSession: jest.fn(),
}))

// Stub global fetch to simulate vibe_api being unreachable.
const originalFetch = global.fetch

function makePostRequest(
  url: string,
  body: Record<string, unknown>,
): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'nself-session=test-token',
      'x-csrf-token': 'test-csrf',
    },
    body: JSON.stringify(body),
  })
}

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(url, {
    headers: { Cookie: 'nself-session=test-token' },
  })
}

describe('vibe routes — vibe_api offline returns 503, no stub data', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      NSELF_VIBE_ENABLED: 'true',
    }

    // Simulate ECONNREFUSED from vibe_api
    global.fetch = jest.fn().mockRejectedValue(
      Object.assign(new Error('fetch failed'), {
        cause: { code: 'ECONNREFUSED' },
      }),
    )
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  describe('POST /api/vibe/session', () => {
    it('returns 503 with X-Service-Required: vibe_api when vibe_api is unreachable', async () => {
      const { POST } = await import('../session/route')
      const req = makePostRequest('http://localhost:3021/api/vibe/session', {
        target_env: 'local',
      })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(503)
      expect(res.headers.get('X-Service-Required')).toBe('vibe_api')
      expect(data.service).toBe('vibe_api')
      // Must not contain any stub session shape
      expect(data).not.toHaveProperty('_stub')
      expect(data).not.toHaveProperty('id')
    })
  })

  describe('POST /api/vibe/generate', () => {
    it('returns 503 with X-Service-Required: vibe_api when vibe_api is unreachable', async () => {
      const { POST } = await import('../generate/route')
      const req = makePostRequest('http://localhost:3021/api/vibe/generate', {
        session_id: 'sess-001',
        prompt: 'Add a comments table',
      })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(503)
      expect(res.headers.get('X-Service-Required')).toBe('vibe_api')
      expect(data.service).toBe('vibe_api')
      // Must not contain any stub generation shape
      expect(data).not.toHaveProperty('_stub')
      expect(data).not.toHaveProperty('migration_sql')
      expect(data).not.toHaveProperty('ui_files')
    })
  })

  describe('GET /api/vibe/stream', () => {
    it('returns 503 with X-Service-Required: vibe_api when vibe_api is unreachable', async () => {
      const { GET } = await import('../stream/route')
      const req = makeGetRequest(
        'http://localhost:3021/api/vibe/stream?session_id=sess-001&generation_id=gen-001',
      )
      const res = await GET(req)

      expect(res.status).toBe(503)
      expect(res.headers.get('X-Service-Required')).toBe('vibe_api')

      const data = (await res.json()) as Record<string, unknown>
      expect(data.service).toBe('vibe_api')
      // Must not be a text/event-stream (no SSE stub stream)
      expect(res.headers.get('Content-Type')).not.toContain('text/event-stream')
    })
  })

  describe('GET /api/vibe/session (list)', () => {
    it('returns 503 with X-Service-Required: vibe_api when vibe_api is unreachable', async () => {
      const { GET } = await import('../session/route')
      const req = makeGetRequest('http://localhost:3021/api/vibe/session')
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(503)
      expect(res.headers.get('X-Service-Required')).toBe('vibe_api')
      expect(data.service).toBe('vibe_api')
      // Must not return a silent empty list
      expect(data).not.toHaveProperty('sessions')
    })
  })
})

describe('vibe routes — disabled returns 503 (no stub)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, NSELF_VIBE_ENABLED: 'false' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('POST /api/vibe/session returns 503 when vibe disabled', async () => {
    jest.resetModules()
    const { POST } = await import('../session/route')
    const req = makePostRequest('http://localhost:3021/api/vibe/session', {
      target_env: 'local',
    })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(503)
    expect(data).not.toHaveProperty('_stub')
  })
})
