/**
 * SSO header detection for Cloudflare Access / nginx auth_request deployments.
 *
 * When NSELF_ADMIN_SSO_HEADER_ENABLED=true, the admin reads the authenticated
 * user email from an HTTP header injected by an upstream auth proxy instead of
 * requiring the operator to enter a password.
 *
 * Supported header: CF-Access-Authenticated-User-Email (Cloudflare Access default)
 * Override via NSELF_ADMIN_SSO_HEADER_NAME env var.
 *
 * Auto-provision: when NSELF_ADMIN_SSO_AUTO_PROVISION=true, an unknown email is
 * silently accepted and a session is created. When false (default), an unknown
 * email returns null and the caller should respond with 403.
 */

import { NextRequest } from 'next/server'

export interface SSOConfig {
  enabled: boolean
  headerName: string
  autoProvision: boolean
}

export function getSSOConfig(): SSOConfig {
  return {
    enabled: process.env.NSELF_ADMIN_SSO_HEADER_ENABLED === 'true',
    headerName:
      process.env.NSELF_ADMIN_SSO_HEADER_NAME ||
      'CF-Access-Authenticated-User-Email',
    autoProvision: process.env.NSELF_ADMIN_SSO_AUTO_PROVISION === 'true',
  }
}

/**
 * Returns the authenticated email from an SSO header, or null if not present
 * or SSO is disabled.
 */
export function getSSOEmail(request: NextRequest): string | null {
  const config = getSSOConfig()
  if (!config.enabled) return null

  const email = request.headers.get(config.headerName)
  if (!email || !email.includes('@')) return null

  return email.toLowerCase().trim()
}

/**
 * Returns true when the request carries a valid SSO header and SSO is enabled.
 */
export function hasSSOHeader(request: NextRequest): boolean {
  return getSSOEmail(request) !== null
}
