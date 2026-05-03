import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/auth-db', () => ({
  validateSessionToken: jest.fn(),
}))

jest.mock('@/lib/database', () => ({
  getSession: jest.fn(),
}))

import { validateSessionToken } from '@/lib/auth-db'

function makeRequest(withSession = true): NextRequest {
  return new NextRequest('http://localhost:3021/api/account/me', {
    headers: withSession ? { Cookie: 'nself-session=test-token' } : {},
  })
}

describe('GET /api/account/me', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    ;(validateSessionToken as jest.Mock).mockResolvedValue(true)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns 401 when no session cookie', async () => {
    ;(validateSessionToken as jest.Mock).mockResolvedValue(false)
    const res = await GET(makeRequest(false))
    expect(res.status).toBe(401)
  })

  it('returns 503 with X-Service-Required: auth when NSELF_AUTH_URL is not set', async () => {
    delete process.env.NSELF_AUTH_URL
    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(503)
    expect(res.headers.get('X-Service-Required')).toBe('auth')
    expect(data.success).toBe(false)
    expect(data.service).toBe('auth')
  })

  it('returns 503 with X-Service-Required: auth when NSELF_AUTH_URL is empty string', async () => {
    process.env.NSELF_AUTH_URL = ''
    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(503)
    expect(res.headers.get('X-Service-Required')).toBe('auth')
    expect(data.success).toBe(false)
  })

  it('returns 503 when auth service is unreachable', async () => {
    process.env.NSELF_AUTH_URL = 'http://127.0.0.1:19999'
    // fetch will throw ECONNREFUSED — the route should catch it and return 503
    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(503)
    expect(res.headers.get('X-Service-Required')).toBe('auth')
    expect(data.success).toBe(false)
  })
})
