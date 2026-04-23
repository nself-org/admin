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

  it('returns stub data when NSELF_AUTH_URL is not set', async () => {
    delete process.env.NSELF_AUTH_URL
    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('email')
    expect(data.data).toHaveProperty('tier')
    expect(data.data).toHaveProperty('licenseCount')
    expect(data.data).toHaveProperty('lastLogin')
  })

  it('returns 200 success stub when NSELF_AUTH_URL is empty string', async () => {
    process.env.NSELF_AUTH_URL = ''
    const res = await GET(makeRequest())
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
