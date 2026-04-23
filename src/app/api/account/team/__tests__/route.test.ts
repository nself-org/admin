import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/auth-db', () => ({
  validateSessionToken: jest.fn(),
}))

jest.mock('@/lib/database', () => ({
  getSession: jest.fn(),
}))

jest.mock('@/lib/feature-flags', () => ({
  isMultiUserEnabled: jest.fn(),
}))

import { validateSessionToken } from '@/lib/auth-db'
import { isMultiUserEnabled } from '@/lib/feature-flags'

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3021/api/account/team', {
    headers: { Cookie: 'nself-session=test-token' },
  })
}

describe('GET /api/account/team', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(validateSessionToken as jest.Mock).mockResolvedValue(true)
  })

  it('returns 404 when NSELF_ADMIN_MULTIUSER is disabled', async () => {
    ;(isMultiUserEnabled as jest.Mock).mockReturnValue(false)
    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.error).toBe('not_available')
  })

  it('returns stub empty data when multiuser enabled but NSELF_AUTH_URL not set', async () => {
    ;(isMultiUserEnabled as jest.Mock).mockReturnValue(true)
    delete process.env.NSELF_AUTH_URL

    const res = await GET(makeRequest())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(data.data)).toBe(true)
  })
})
