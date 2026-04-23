import { NextRequest } from 'next/server'
import { POST } from '../route'

jest.mock('@/lib/auth-db', () => ({
  createLoginSession: jest.fn(),
}))

jest.mock('@/lib/database', () => ({
  getSession: jest.fn(),
}))

jest.mock('@/lib/csrf', () => ({
  setCSRFCookie: jest.fn(),
}))

import { createLoginSession } from '@/lib/auth-db'
import { getSession } from '@/lib/database'

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3021/api/auth/sso', {
    method: 'POST',
    headers,
  })
}

describe('POST /api/auth/sso', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns 403 when SSO is disabled', async () => {
    delete process.env.NSELF_ADMIN_SSO_HEADER_ENABLED
    const req = makeRequest({
      'CF-Access-Authenticated-User-Email': 'admin@example.com',
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toMatch(/disabled/i)
  })

  it('returns 403 when SSO is enabled but header is absent', async () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    const req = makeRequest({})
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toMatch(/absent/i)
  })

  it('returns 403 when SSO header contains invalid email', async () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    const req = makeRequest({
      'CF-Access-Authenticated-User-Email': 'not-an-email',
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.success).toBe(false)
  })

  it('creates session and sets cookie when SSO header is valid', async () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    ;(createLoginSession as jest.Mock).mockResolvedValue('sso-session-token')
    ;(getSession as jest.Mock).mockResolvedValue({ csrfToken: 'csrf-abc' })

    const req = makeRequest({
      'CF-Access-Authenticated-User-Email': 'admin@example.com',
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.sso).toBe(true)
    expect(data.email).toBe('admin@example.com')
    expect(data.expiresAt).toBeTruthy()

    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain('nself-session=sso-session-token')
  })

  it('calls createLoginSession with rememberMe=false (short-lived SSO session)', async () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    ;(createLoginSession as jest.Mock).mockResolvedValue('tok')
    ;(getSession as jest.Mock).mockResolvedValue(null)

    const req = makeRequest({
      'CF-Access-Authenticated-User-Email': 'ops@example.com',
    })
    await POST(req)

    expect(createLoginSession).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      false,
    )
  })

  it('returns 500 when createLoginSession throws', async () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    ;(createLoginSession as jest.Mock).mockRejectedValue(
      new Error('DB write failed'),
    )

    const req = makeRequest({
      'CF-Access-Authenticated-User-Email': 'admin@example.com',
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toMatch(/failed/i)
  })

  it('respects custom NSELF_ADMIN_SSO_HEADER_NAME', async () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    process.env.NSELF_ADMIN_SSO_HEADER_NAME = 'X-Auth-Request-Email'
    ;(createLoginSession as jest.Mock).mockResolvedValue('tok2')
    ;(getSession as jest.Mock).mockResolvedValue(null)

    const req = makeRequest({
      'X-Auth-Request-Email': 'ops@custom.com',
    })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.email).toBe('ops@custom.com')
  })
})
