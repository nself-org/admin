import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock dependencies
jest.mock('@/lib/auth-db', () => ({
  validateSessionToken: jest.fn(),
}))

jest.mock('@/lib/database', () => ({
  getSession: jest.fn(),
}))

import { validateSessionToken } from '@/lib/auth-db'
import { getSession } from '@/lib/database'

describe('GET /api/auth/check', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 with no session cookie', async () => {
    const request = new NextRequest('http://localhost:3021/api/auth/check')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('No session')
  })

  it('returns 401 for invalid session token', async () => {
    const request = new NextRequest('http://localhost:3021/api/auth/check', {
      headers: {
        Cookie: 'nself-session=invalid-token',
      },
    })
    ;(validateSessionToken as jest.Mock).mockResolvedValue(false)

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid or expired session')
  })

  it('returns 401 if session not found in database', async () => {
    const request = new NextRequest('http://localhost:3021/api/auth/check', {
      headers: {
        Cookie: 'nself-session=valid-token',
      },
    })
    ;(validateSessionToken as jest.Mock).mockResolvedValue(true)
    ;(getSession as jest.Mock).mockResolvedValue(null)

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Session not found')
  })

  it('returns 200 for valid session', async () => {
    const mockSession = {
      userId: 'admin',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    }

    const request = new NextRequest('http://localhost:3021/api/auth/check', {
      headers: {
        Cookie: 'nself-session=valid-token',
      },
    })
    ;(validateSessionToken as jest.Mock).mockResolvedValue(true)
    ;(getSession as jest.Mock).mockResolvedValue(mockSession)

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.userId).toBe('admin')
    expect(data.expiresAt).toBeTruthy()
  })

  it('returns 500 on unexpected errors', async () => {
    const request = new NextRequest('http://localhost:3021/api/auth/check', {
      headers: {
        Cookie: 'nself-session=valid-token',
      },
    })
    ;(validateSessionToken as jest.Mock).mockRejectedValue(new Error('Database error'))

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Authentication check failed')
  })
})
