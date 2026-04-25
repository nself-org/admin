/**
 * Unit tests for requireAuth middleware.
 *
 * Covers S121-T01 acceptance criteria:
 *  - no-session → 401
 *  - invalid-CSRF → 403
 *  - pre-setup blocked → 403 (postSetupOnly default)
 *  - valid-session + valid-CSRF → null (pass-through)
 */

import { NextRequest } from 'next/server'

// ── Mock next/headers ────────────────────────────────────────────────────────
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

// ── Mock database (hasAdminPassword) ────────────────────────────────────────
jest.mock('@/lib/database', () => ({
  hasAdminPassword: jest.fn(),
}))

// ── Mock csrf (validateCSRFToken) ────────────────────────────────────────────
jest.mock('@/lib/csrf', () => ({
  validateCSRFToken: jest.fn(),
}))

import { validateCSRFToken } from '@/lib/csrf'
import { hasAdminPassword } from '@/lib/database'
import { cookies } from 'next/headers'
import {
  requireAuth,
  requireAuthPreSetup,
  requireWizardNotComplete,
} from '../require-auth'

const mockCookies = cookies as jest.MockedFunction<typeof cookies>
const mockHasAdminPassword = hasAdminPassword as jest.MockedFunction<
  typeof hasAdminPassword
>
const mockValidateCSRFToken = validateCSRFToken as jest.MockedFunction<
  typeof validateCSRFToken
>

/**
 * Build a NextRequest with optional session cookie (via next/headers mock)
 * and CSRF header.
 *
 * Session token is provided through the `cookies()` mock (next/headers) since
 * NextRequest.cookies is non-configurable in the jsdom environment.
 */
function makeRequest(
  opts: {
    method?: string
    sessionToken?: string | null
    csrfHeader?: string | null
  } = {},
): NextRequest {
  const { method = 'POST', sessionToken, csrfHeader } = opts
  const headers: Record<string, string> = {}
  if (csrfHeader !== undefined && csrfHeader !== null) {
    headers['x-csrf-token'] = csrfHeader
  }

  const req = new NextRequest('http://localhost:3021/api/test', {
    method,
    headers,
  })

  // Session is provided via the next/headers cookies() mock, which is what
  // requireAuth reads first. This avoids fighting with NextRequest.cookies.
  mockCookies.mockResolvedValue({
    get: (name: string) =>
      name === 'nself-session' && sessionToken
        ? { value: sessionToken }
        : undefined,
    getAll: () => [],
    has: () => false,
    set: jest.fn(),
    delete: jest.fn(),
  } as any)

  return req
}

// Reset mocks before every test.
beforeEach(() => {
  jest.resetAllMocks()
  // Default: no session cookie.
  mockCookies.mockResolvedValue({
    get: () => undefined,
    getAll: () => [],
    has: () => false,
    set: jest.fn(),
    delete: jest.fn(),
  } as any)
})

// ─────────────────────────────────────────────────────────────────────────────
// Setup-complete gate (postSetupOnly = true by default)
// ─────────────────────────────────────────────────────────────────────────────

describe('setup-complete gate', () => {
  it('returns 403 when setup is not complete (default postSetupOnly=true)', async () => {
    mockHasAdminPassword.mockResolvedValue(false)

    const req = makeRequest({
      sessionToken: 'valid-token',
      csrfHeader: 'valid-csrf',
    })
    const result = await requireAuth(req)

    expect(result).not.toBeNull()
    expect(result!.status).toBe(403)
    const body = await result!.json()
    expect(body.error).toMatch(/setup not complete/i)
  })

  it('does NOT call hasAdminPassword when postSetupOnly=false on GET', async () => {
    const req = makeRequest({ method: 'GET' })
    const result = await requireAuth(req, { postSetupOnly: false })

    // Setup gate skipped entirely for GET + postSetupOnly:false.
    expect(mockHasAdminPassword).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('allows through when setup IS complete (postSetupOnly=true)', async () => {
    mockHasAdminPassword.mockResolvedValue(true)
    mockValidateCSRFToken.mockResolvedValue(true)

    const req = makeRequest({
      sessionToken: 'valid-token',
      csrfHeader: 'csrf-token',
    })
    const result = await requireAuth(req)

    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Session check (no-session → 401)
// ─────────────────────────────────────────────────────────────────────────────

describe('session check', () => {
  it('returns 401 when no session token is present (POST)', async () => {
    mockHasAdminPassword.mockResolvedValue(true)

    const req = makeRequest({ sessionToken: null })
    const result = await requireAuth(req)

    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
    const body = await result!.json()
    expect(body.error).toMatch(/not authenticated/i)
  })

  it('returns 401 when no session token on PUT', async () => {
    mockHasAdminPassword.mockResolvedValue(true)
    const req = makeRequest({ method: 'PUT', sessionToken: null })
    const result = await requireAuth(req)
    expect(result!.status).toBe(401)
  })

  it('returns 401 when no session token on DELETE', async () => {
    mockHasAdminPassword.mockResolvedValue(true)
    const req = makeRequest({ method: 'DELETE', sessionToken: null })
    const result = await requireAuth(req)
    expect(result!.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CSRF check (invalid CSRF → 403)
// ─────────────────────────────────────────────────────────────────────────────

describe('CSRF check', () => {
  it('returns 403 when CSRF token is invalid (POST with valid session)', async () => {
    mockHasAdminPassword.mockResolvedValue(true)
    mockValidateCSRFToken.mockResolvedValue(false)

    const req = makeRequest({
      sessionToken: 'valid-token',
      csrfHeader: 'bad-token',
    })
    const result = await requireAuth(req)

    expect(result).not.toBeNull()
    expect(result!.status).toBe(403)
    const body = await result!.json()
    expect(body.error).toMatch(/csrf/i)
  })

  it('returns 403 when CSRF header is absent', async () => {
    mockHasAdminPassword.mockResolvedValue(true)
    mockValidateCSRFToken.mockResolvedValue(false)

    const req = makeRequest({ sessionToken: 'valid-token', csrfHeader: null })
    const result = await requireAuth(req)

    expect(result!.status).toBe(403)
  })

  it('skips CSRF check when csrf=false', async () => {
    mockHasAdminPassword.mockResolvedValue(true)

    const req = makeRequest({ sessionToken: 'valid-token', csrfHeader: null })
    const result = await requireAuth(req, { csrf: false })

    // validateCSRFToken should NOT have been called.
    expect(mockValidateCSRFToken).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Valid session pass-through → null
// ─────────────────────────────────────────────────────────────────────────────

describe('valid session pass-through', () => {
  it('returns null (pass) when setup complete, session valid, CSRF valid (POST)', async () => {
    mockHasAdminPassword.mockResolvedValue(true)
    mockValidateCSRFToken.mockResolvedValue(true)

    const req = makeRequest({
      sessionToken: 'valid-token',
      csrfHeader: 'valid-csrf',
    })
    const result = await requireAuth(req)

    expect(result).toBeNull()
  })

  it('returns null for GET when setup is complete and session valid', async () => {
    mockHasAdminPassword.mockResolvedValue(true)

    const req = makeRequest({ method: 'GET', sessionToken: 'valid-token' })
    const result = await requireAuth(req)
    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// requireAuthPreSetup (wizard convenience wrapper)
// ─────────────────────────────────────────────────────────────────────────────

describe('requireAuthPreSetup', () => {
  it('skips setup gate and passes GET without session check', async () => {
    const req = makeRequest({ method: 'GET' })
    const result = await requireAuthPreSetup(req)
    expect(mockHasAdminPassword).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('still enforces session check for POST when no session', async () => {
    const req = makeRequest({ sessionToken: null })
    const result = await requireAuthPreSetup(req)
    expect(result!.status).toBe(401)
  })

  it('still enforces CSRF check for POST with session', async () => {
    mockValidateCSRFToken.mockResolvedValue(false)

    const req = makeRequest({ sessionToken: 'valid-token', csrfHeader: 'bad' })
    const result = await requireAuthPreSetup(req)
    expect(result!.status).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// requireWizardNotComplete (post-setup write block)
// ─────────────────────────────────────────────────────────────────────────────

describe('requireWizardNotComplete', () => {
  it('returns null for GET regardless of setup state (reads always allowed)', async () => {
    const req = makeRequest({ method: 'GET' })
    const result = await requireWizardNotComplete(req)
    expect(mockHasAdminPassword).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('returns 403 for POST when setup IS complete', async () => {
    mockHasAdminPassword.mockResolvedValue(true)

    const req = makeRequest({ method: 'POST' })
    const result = await requireWizardNotComplete(req)

    expect(result).not.toBeNull()
    expect(result!.status).toBe(403)
    const body = await result!.json()
    expect(body.error).toMatch(/setup already complete/i)
  })

  it('returns null for POST when setup is NOT complete', async () => {
    mockHasAdminPassword.mockResolvedValue(false)

    const req = makeRequest({ method: 'POST' })
    const result = await requireWizardNotComplete(req)
    expect(result).toBeNull()
  })
})
