import { NextRequest } from 'next/server'
import { getSSOConfig, getSSOEmail, hasSSOHeader } from '../sso'

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3021/dashboard', { headers })
}

describe('SSO header detection', () => {
  afterEach(() => {
    delete process.env.NSELF_ADMIN_SSO_HEADER_ENABLED
    delete process.env.NSELF_ADMIN_SSO_HEADER_NAME
    delete process.env.NSELF_ADMIN_SSO_AUTO_PROVISION
  })

  describe('getSSOConfig', () => {
    it('returns disabled by default', () => {
      const cfg = getSSOConfig()
      expect(cfg.enabled).toBe(false)
      expect(cfg.headerName).toBe('CF-Access-Authenticated-User-Email')
      expect(cfg.autoProvision).toBe(false)
    })

    it('reads NSELF_ADMIN_SSO_HEADER_ENABLED', () => {
      process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
      expect(getSSOConfig().enabled).toBe(true)
    })

    it('reads custom NSELF_ADMIN_SSO_HEADER_NAME', () => {
      process.env.NSELF_ADMIN_SSO_HEADER_NAME = 'X-Auth-Request-Email'
      expect(getSSOConfig().headerName).toBe('X-Auth-Request-Email')
    })

    it('reads NSELF_ADMIN_SSO_AUTO_PROVISION', () => {
      process.env.NSELF_ADMIN_SSO_AUTO_PROVISION = 'true'
      expect(getSSOConfig().autoProvision).toBe(true)
    })
  })

  describe('getSSOEmail', () => {
    it('returns null when SSO is disabled', () => {
      const req = makeRequest({
        'CF-Access-Authenticated-User-Email': 'admin@example.com',
      })
      expect(getSSOEmail(req)).toBeNull()
    })

    it('returns null when SSO enabled but header missing', () => {
      process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
      const req = makeRequest({})
      expect(getSSOEmail(req)).toBeNull()
    })

    it('returns null for invalid email (no @)', () => {
      process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
      const req = makeRequest({
        'CF-Access-Authenticated-User-Email': 'notanemail',
      })
      expect(getSSOEmail(req)).toBeNull()
    })

    it('returns lowercased trimmed email when SSO enabled and header present', () => {
      process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
      const req = makeRequest({
        'CF-Access-Authenticated-User-Email': ' Admin@Example.COM ',
      })
      expect(getSSOEmail(req)).toBe('admin@example.com')
    })

    it('respects custom header name', () => {
      process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
      process.env.NSELF_ADMIN_SSO_HEADER_NAME = 'X-Auth-Request-Email'
      const req = makeRequest({ 'X-Auth-Request-Email': 'ops@example.com' })
      expect(getSSOEmail(req)).toBe('ops@example.com')
    })
  })

  describe('hasSSOHeader', () => {
    it('returns false when SSO disabled', () => {
      const req = makeRequest({
        'CF-Access-Authenticated-User-Email': 'admin@example.com',
      })
      expect(hasSSOHeader(req)).toBe(false)
    })

    it('returns true when SSO enabled and valid header present', () => {
      process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
      const req = makeRequest({
        'CF-Access-Authenticated-User-Email': 'admin@example.com',
      })
      expect(hasSSOHeader(req)).toBe(true)
    })

    it('returns false when SSO enabled but header absent', () => {
      process.env.NSELF_ADMIN_SSO_HEADER_ENABLED = 'true'
      const req = makeRequest({})
      expect(hasSSOHeader(req)).toBe(false)
    })
  })
})
