/**
 * T03: CF Access JWT verification tests for admin/src/lib/sso.ts
 *
 * Four required paths (per ticket acceptance criteria):
 * 1. Valid JWT passes — email returned from verified JWT payload
 * 2. Missing JWT blocks — returns null (no email header fallback)
 * 3. Tampered JWT blocks — returns null (signature verification fails)
 * 4. Forged email header without valid JWT rejected — raw header is NOT trusted
 */

import { type NextRequest } from 'next/server'
import { getSSOConfig, getSSOEmail, hasSSOHeader, verifyCFAccessJWT } from '../sso'

// ── Mock jose so tests don't need real Cloudflare JWKS ───────────────────────

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'mock-jwks-keyset'),
  jwtVerify: jest.fn(),
}))

const mockJwtVerify = jest.requireMock('jose').jwtVerify as jest.Mock

// ── Helper: build a minimal NextRequest mock ─────────────────────────────────

function buildRequest(opts: {
  headers?: Record<string, string>
  cookies?: Record<string, string>
}): NextRequest {
  const headers = new Headers(opts.headers || {})
  const cookieMap = new Map<string, string>(Object.entries(opts.cookies || {}))

  return {
    headers,
    cookies: {
      get: (name: string) =>
        cookieMap.has(name) ? { value: cookieMap.get(name)! } : undefined,
    },
  } as unknown as NextRequest
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('sso.ts — getSSOConfig', () => {
  afterEach(() => {
    delete process.env.NSELF_ADMIN_SSO_HEADER_ENABLED
    delete process.env.NSELF_ADMIN_SSO_HEADER_NAME
    delete process.env.NSELF_ADMIN_SSO_AUTO_PROVISION
    delete process.env.NSELF_ADMIN_CF_TEAM_DOMAIN
    delete process.env.NSELF_ADMIN_CF_AUD
    delete process.env.NSELF_ADMIN_SSO_DEV_BYPASS
  })

  it('returns disabled by default', () => {
    const cfg = getSSOConfig()
    expect(cfg.enabled).toBe(false)
    expect(cfg.headerName).toBe('CF-Access-Authenticated-User-Email')
    expect(cfg.autoProvision).toBe(false)
    expect(cfg.cfTeamDomain).toBe('')
    expect(cfg.cfAud).toBe('')
    expect(cfg.devBypass).toBe(false)
  })

  it('reads NSELF_ADMIN_SSO_HEADER_ENABLED', () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    expect(getSSOConfig().enabled).toBe(true)
  })

  it('reads NSELF_ADMIN_CF_TEAM_DOMAIN', () => {
    process.env.NSELF_ADMIN_CF_TEAM_DOMAIN = 'example.cloudflareaccess.com'
    expect(getSSOConfig().cfTeamDomain).toBe('example.cloudflareaccess.com')
  })

  it('reads NSELF_ADMIN_SSO_DEV_BYPASS', () => {
    process.env.NSELF_ADMIN_SSO_DEV_BYPASS = 'true'
    expect(getSSOConfig().devBypass).toBe(true)
  })
})

describe('sso.ts — CF Access JWT verification (T03)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.NSELF_ADMIN_SSO_HEADER_ENABLED
    delete process.env.NSELF_ADMIN_CF_TEAM_DOMAIN
    delete process.env.NSELF_ADMIN_CF_AUD
    delete process.env.NSELF_ADMIN_SSO_DEV_BYPASS
  })

  // ── 1. Valid JWT passes ────────────────────────────────────────────────────

  it('T03-1: returns email from verified JWT payload when JWT is valid', async () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    process.env.NSELF_ADMIN_CF_TEAM_DOMAIN = 'example.cloudflareaccess.com'
    process.env.NSELF_ADMIN_CF_AUD = 'test-audience-tag'

    mockJwtVerify.mockResolvedValueOnce({
      payload: { email: 'admin@example.com', sub: 'user-123', aud: 'test-audience-tag' },
      protectedHeader: { alg: 'RS256' },
    })

    const req = buildRequest({
      headers: {
        CF_Authorization: 'eyJhbGciOiJSUzI1NiJ9.valid.sig',
        // Raw email header is present but must NOT be the source of truth
        'CF-Access-Authenticated-User-Email': 'attacker@evil.com',
      },
    })

    const email = await getSSOEmail(req)
    expect(email).toBe('admin@example.com') // from JWT payload, not raw header
    expect(mockJwtVerify).toHaveBeenCalledTimes(1)
  })

  // ── 2. Missing JWT blocks ──────────────────────────────────────────────────

  it('T03-2: returns null when CF_Authorization JWT is absent', async () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    process.env.NSELF_ADMIN_CF_TEAM_DOMAIN = 'example.cloudflareaccess.com'

    // No CF_Authorization header or cookie — only the raw email header.
    const req = buildRequest({
      headers: {
        'CF-Access-Authenticated-User-Email': 'admin@example.com',
      },
    })

    const email = await getSSOEmail(req)
    expect(email).toBeNull()
    // jwtVerify should not be called — we throw before reaching it.
    expect(mockJwtVerify).not.toHaveBeenCalled()
  })

  // ── 3. Tampered JWT blocks ─────────────────────────────────────────────────

  it('T03-3: returns null when JWT signature verification fails (tampered token)', async () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    process.env.NSELF_ADMIN_CF_TEAM_DOMAIN = 'example.cloudflareaccess.com'

    // Simulate jose throwing on signature mismatch.
    mockJwtVerify.mockRejectedValueOnce(new Error('JWSSignatureVerificationFailed'))

    const req = buildRequest({
      headers: {
        CF_Authorization: 'eyJhbGciOiJSUzI1NiJ9.tampered.badsig',
        'CF-Access-Authenticated-User-Email': 'admin@example.com',
      },
    })

    const email = await getSSOEmail(req)
    expect(email).toBeNull()
    expect(mockJwtVerify).toHaveBeenCalledTimes(1)
  })

  // ── 4. Forged email header without valid JWT is rejected ──────────────────

  it('T03-4: does not trust raw email header when JWT is absent (forged header attack)', async () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    process.env.NSELF_ADMIN_CF_TEAM_DOMAIN = 'example.cloudflareaccess.com'

    // Attacker bypasses Cloudflare proxy and sends forged email header.
    // There is no CF_Authorization JWT because the attacker is not going
    // through the real CF Access flow.
    const req = buildRequest({
      headers: {
        'CF-Access-Authenticated-User-Email': 'superadmin@example.com',
        // No CF_Authorization header or cookie
      },
    })

    const email = await getSSOEmail(req)
    expect(email).toBeNull()
    // Must not return the forged header value.
    expect(email).not.toBe('superadmin@example.com')
  })

  // ── SSO disabled: always returns null ────────────────────────────────────

  it('returns null when SSO is disabled regardless of headers', async () => {
    // NSELF_ADMIN_SSO_HEADER_ENABLED not set (defaults to disabled).
    const req = buildRequest({
      headers: {
        CF_Authorization: 'eyJhbGciOiJSUzI1NiJ9.valid.sig',
        'CF-Access-Authenticated-User-Email': 'admin@example.com',
      },
    })

    const email = await getSSOEmail(req)
    expect(email).toBeNull()
    expect(mockJwtVerify).not.toHaveBeenCalled()
  })

  // ── Dev bypass path ───────────────────────────────────────────────────────

  it('dev bypass returns email from header without JWKS call (NSELF_ADMIN_SSO_DEV_BYPASS=true)', async () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    process.env.NSELF_ADMIN_SSO_DEV_BYPASS = 'true'
    // No CF_TEAM_DOMAIN set (not required in dev bypass)

    const req = buildRequest({
      headers: {
        'CF-Access-Authenticated-User-Email': 'dev@localhost',
      },
    })

    const email = await getSSOEmail(req)
    expect(email).toBe('dev@localhost')
    // No JWKS fetch in dev bypass mode.
    expect(mockJwtVerify).not.toHaveBeenCalled()
  })

  // ── verifyCFAccessJWT unit: missing team domain throws ────────────────────

  it('verifyCFAccessJWT throws when CF_TEAM_DOMAIN is not set and dev bypass is off', async () => {
    const config = getSSOConfig()
    // config.devBypass is false, config.cfTeamDomain is '' (both not set).

    const req = buildRequest({
      headers: { CF_Authorization: 'some.token.here' },
    })

    await expect(verifyCFAccessJWT(req, config)).rejects.toThrow(
      'NSELF_ADMIN_CF_TEAM_DOMAIN is required'
    )
  })
})

describe('sso.ts — hasSSOHeader (async)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.NSELF_ADMIN_SSO_HEADER_ENABLED
    delete process.env.NSELF_ADMIN_CF_TEAM_DOMAIN
    delete process.env.NSELF_ADMIN_SSO_DEV_BYPASS
  })

  it('returns false when SSO is disabled', async () => {
    const req = buildRequest({
      headers: { 'CF-Access-Authenticated-User-Email': 'admin@example.com' },
    })
    expect(await hasSSOHeader(req)).toBe(false)
  })

  it('returns true when dev bypass is on and email header present', async () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    process.env.NSELF_ADMIN_SSO_DEV_BYPASS = 'true'
    const req = buildRequest({
      headers: { 'CF-Access-Authenticated-User-Email': 'admin@example.com' },
    })
    expect(await hasSSOHeader(req)).toBe(true)
  })

  it('returns false when JWT is absent (no header, no cookie)', async () => {
    process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
    process.env.NSELF_ADMIN_CF_TEAM_DOMAIN = 'example.cloudflareaccess.com'
    const req = buildRequest({
      headers: { 'CF-Access-Authenticated-User-Email': 'admin@example.com' },
    })
    expect(await hasSSOHeader(req)).toBe(false)
  })
})
