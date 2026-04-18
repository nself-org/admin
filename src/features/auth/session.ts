/**
 * Session management for nSelf Admin pairing.
 * Wraps keychain retrieval, API-based refresh, and session revocation.
 */

import {
  clearKeychain,
  retrieveTokenFromKeychain,
  storeTokenInKeychain,
} from './pairing'
import type { AuthToken, PairingError } from './types'

const REVOKE_ENDPOINT = '/api/auth/pairing'
const REFRESH_ENDPOINT = '/api/auth/pairing/refresh'
// Refresh buffer: attempt refresh when fewer than 5 minutes remain
const REFRESH_BUFFER_MS = 5 * 60 * 1000

function makePairingError(
  message: string,
  code: PairingError['code'],
  details?: string,
): PairingError {
  const err = new Error(message) as PairingError
  err.code = code
  err.details = details
  return err
}

function isTokenExpired(token: AuthToken): boolean {
  const expiresAt = new Date(token.expiresAt).getTime()
  return Date.now() >= expiresAt
}

function isTokenNearExpiry(token: AuthToken): boolean {
  const expiresAt = new Date(token.expiresAt).getTime()
  return Date.now() >= expiresAt - REFRESH_BUFFER_MS
}

/**
 * Returns the current active AuthToken, or null if not paired / token expired.
 * Does NOT auto-refresh; callers should check and call refreshSession if needed.
 */
export async function getCurrentSession(): Promise<AuthToken | null> {
  const token = await retrieveTokenFromKeychain()
  if (!token) return null
  if (isTokenExpired(token)) {
    // Expired token — clear it so we don't serve stale data
    await clearKeychain()
    return null
  }
  return token
}

/**
 * Returns true when a valid, non-expired token is present in the keychain.
 */
export async function isSessionActive(): Promise<boolean> {
  const session = await getCurrentSession()
  return session !== null
}

/**
 * Returns true when the current token is near expiry and should be refreshed.
 */
export async function shouldRefreshSession(): Promise<boolean> {
  const token = await retrieveTokenFromKeychain()
  if (!token) return false
  if (isTokenExpired(token)) return false
  return isTokenNearExpiry(token)
}

/**
 * Refreshes the current auth token via the nself.org API.
 * Stores the new token in the keychain and returns it.
 */
export async function refreshSession(token: AuthToken): Promise<AuthToken> {
  let response: Response

  try {
    response = await fetch(REFRESH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    })
  } catch (err) {
    throw makePairingError(
      'Network error during token refresh',
      'REFRESH_FAILED',
      err instanceof Error ? err.message : String(err),
    )
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw makePairingError(
      `Token refresh failed with status ${response.status}`,
      'REFRESH_FAILED',
      body,
    )
  }

  const data = (await response.json()) as { token: AuthToken }
  const newToken = data.token

  await storeTokenInKeychain(newToken)
  return newToken
}

/**
 * Revokes the current session:
 * 1. Calls the revoke endpoint on the local API (which forwards to nself.org)
 * 2. Clears the keychain regardless of API result
 */
export async function revokeSession(): Promise<void> {
  const token = await retrieveTokenFromKeychain()

  if (token) {
    try {
      await fetch(REVOKE_ENDPOINT, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.accessToken}`,
        },
      })
    } catch {
      // Best-effort revoke — always clear local keychain even if API call fails
    }
  }

  await clearKeychain()
}

/**
 * Returns the currently paired user's email, or null if not paired.
 */
export async function getPairedEmail(): Promise<string | null> {
  const token = await getCurrentSession()
  return token?.email ?? null
}
