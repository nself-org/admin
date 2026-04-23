import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/auth-db', () => ({
  validateSessionToken: jest.fn(),
}))

jest.mock('@/lib/database', () => ({
  getSession: jest.fn(),
}))

import { validateSessionToken } from '@/lib/auth-db'

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3021/api/account/licenses', {
    headers: { Cookie: 'nself-session=test-token' },
  })
}

describe('GET /api/account/licenses', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    ;(validateSessionToken as jest.Mock).mockResolvedValue(true)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns 401 when session token is invalid', async () => {
    ;(validateSessionToken as jest.Mock).mockResolvedValue(false)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns offline stub when NSELF_AUTH_URL is not configured', async () => {
    delete process.env.NSELF_AUTH_URL
    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.offline).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data).toHaveLength(0)
  })
})
