/**
 * SSO authentication for Cloudflare Access deployments.
 *
 * Purpose: verify the Cloudflare Access JWT (CF_Authorization) on every SSO
 * request before trusting the CF-Access-Authenticated-User-Email header.
 * Without this verification, any client that bypasses the Cloudflare proxy
 * (direct IP access, misconfigured firewall) can forge an arbitrary email
 * header and gain full admin access.
 *
 * Security model:
 * - Email is ONLY taken from the verified JWT `email` claim.
 * - The raw CF-Access-Authenticated-User-Email header is IGNORED when JWT
 *   verification fails — it is untrusted input if the JWT is absent/invalid.
 * - JWKS is cached in-process (TTL 5 minutes) to avoid per-request fetches.
 *
 * Env vars:
 *   NSELF_ADMIN_SSO_HEADER_ENABLED=true    — master switch for SSO header auth
 *   NSELF_ADMIN_CF_TEAM_DOMAIN             — CF Access team domain, e.g. example.cloudflareaccess.com
 *   NSELF_ADMIN_CF_AUD                     — CF Access application audience tag (from CF dashboard)
 *   NSELF_ADMIN_SSO_AUTO_PROVISION=true    — accept unknown emails (default: false)
 *   NSELF_ADMIN_SSO_DEV_BYPASS=true        — skip JWT verification in local dev (never in prod)
 *
 * Reference: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { type NextRequest } from 'next/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SSOConfig {
  enabled: boolean
  headerName: string
  autoProvision: boolean
  cfTeamDomain: string
  cfAud: string
  devBypass: boolean
}

export interface SSOResult {
  email: string
  payload: JWTPayload
}

// ── JWKS cache ────────────────────────────────────────────────────────────────

interface JwksCache {
  keyset: ReturnType<typeof createRemoteJWKSet>
  teamDomain: string
  expiresAt: number
}

let _jwksCache: JwksCache | null = null
const JWKS_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Returns a cached JWKS keyset for the given team domain, refreshing after TTL.
 * Caching avoids a per-request HTTPS fetch to the Cloudflare CDN while still
 * rotating keys within a reasonable window.
 */
function getJwks(teamDomain: string): ReturnType<typeof createRemoteJWKSet> {
  const now = Date.now()
  if (_jwksCache && _jwksCache.teamDomain === teamDomain && _jwksCache.expiresAt > now) {
    return _jwksCache.keyset
  }
  const certsUrl = new URL(`https://${teamDomain}/cdn-cgi/access/certs`)
  const keyset = createRemoteJWKSet(certsUrl)
  _jwksCache = { keyset, teamDomain, expiresAt: now + JWKS_TTL_MS }
  return keyset
}

// ── Config ────────────────────────────────────────────────────────────────────

export function getSSOConfig(): SSOConfig {
  return {
    enabled: process.env.NSELF_ADMIN_SSO_HEADER_ENABLED === 'true',
    headerName: process.env.NSELF_ADMIN_SSO_HEADER_NAME || 'CF-Access-Authenticated-User-Email',
    autoProvision: process.env.NSELF_ADMIN_SSO_AUTO_PROVISION === 'true',
    cfTeamDomain: process.env.NSELF_ADMIN_CF_TEAM_DOMAIN || '',
    cfAud: process.env.NSELF_ADMIN_CF_AUD || '',
    devBypass: process.env.NSELF_ADMIN_SSO_DEV_BYPASS === 'true',
  }
}

// ── JWT verification ──────────────────────────────────────────────────────────

/**
 * Extracts and cryptographically verifies the CF Access JWT from the request.
 *
 * Token lookup order:
 * 1. CF_Authorization header (standard CF Access flow)
 * 2. cf-access-token cookie (alternative CF Access delivery)
 *
 * Returns the verified JWT payload, or throws if verification fails.
 * The caller must NOT fall back to the raw email header on failure.
 */
export async function verifyCFAccessJWT(
  request: NextRequest,
  config: SSOConfig
): Promise<JWTPayload> {
  // Dev bypass: only active when NSELF_ADMIN_SSO_DEV_BYPASS=true.
  // MUST NOT be set in production. When bypassed, a synthetic payload is
  // returned so the caller can still extract the email from the header.
  if (config.devBypass) {
    const rawEmail =
      request.headers.get(config.headerName) ||
      request.headers.get('CF-Access-Authenticated-User-Email') ||
      'dev@localhost'
    return { email: rawEmail.toLowerCase().trim() } as JWTPayload
  }

  if (!config.cfTeamDomain) {
    throw new Error(
      'NSELF_ADMIN_CF_TEAM_DOMAIN is required for CF Access JWT verification. ' +
        'Set it to your Cloudflare Access team domain (e.g. example.cloudflareaccess.com). ' +
        'To skip in local dev, set NSELF_ADMIN_SSO_DEV_BYPASS=true.'
    )
  }

  // Extract token from CF_Authorization header or cf-access-token cookie.
  const token =
    request.headers.get('CF_Authorization') ||
    request.headers.get('cf-access-token') ||
    request.cookies.get('CF_Authorization')?.value ||
    request.cookies.get('cf-access-token')?.value

  if (!token) {
    throw new Error('CF Access JWT missing: CF_Authorization header/cookie not present')
  }

  const jwks = getJwks(config.cfTeamDomain)

  // Verify RS256 signature, audience, and expiry.
  const { payload } = await jwtVerify(token, jwks, {
    // Audience must match the CF Access application tag to prevent tokens
    // issued for other CF Access applications from being accepted here.
    ...(config.cfAud ? { audience: config.cfAud } : {}),
    algorithms: ['RS256'],
  })

  return payload
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the authenticated email from an SSO request after verifying the
 * Cloudflare Access JWT. Returns null if SSO is disabled, the JWT is absent,
 * or verification fails.
 *
 * Security invariant: email is ONLY returned when the JWT is cryptographically
 * valid. The raw CF-Access-Authenticated-User-Email header is NEVER returned
 * without a valid JWT backing it.
 */
export async function getSSOEmail(request: NextRequest): Promise<string | null> {
  const config = getSSOConfig()
  if (!config.enabled) return null

  try {
    const payload = await verifyCFAccessJWT(request, config)
    const email = payload['email'] as string | undefined
    if (!email || !email.includes('@')) return null
    return email.toLowerCase().trim()
  } catch {
    // JWT absent, expired, or tampered — do not trust the email header.
    return null
  }
}

/**
 * Returns true when the request carries a valid SSO JWT and SSO is enabled.
 */
export async function hasSSOHeader(request: NextRequest): Promise<boolean> {
  return (await getSSOEmail(request)) !== null
}
