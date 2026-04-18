/**
 * Pairing logic for nSelf Admin local instance.
 * Generates state tokens, polls for OAuth result, and manages tokens via
 * API routes that handle OS keychain operations server-side.
 *
 * No Node.js-only imports here — this module is safe to use in client
 * components (Next.js 'use client' boundary).
 */

import type {
  AuthToken,
  KeychainEntry,
  PairingError,
  PairingInitResponse,
  PairingSession,
  PairingStatusResponse,
} from './types'

const POLL_INTERVAL_MS = 2000
const POLL_MAX_ATTEMPTS = 90 // 90 × 2s = 3 min max
const NSELF_ORG_BASE = 'https://nself.org'

const KEYCHAIN_SERVICE = 'nself-admin'
const KEYCHAIN_ACCOUNT = 'nself-auth-token'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `/api/auth/pairing${path}`
  let response: Response

  try {
    response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    })
  } catch (err) {
    throw makePairingError(
      'Network request failed',
      'NETWORK_ERROR',
      err instanceof Error ? err.message : String(err),
    )
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw makePairingError(
      `Request failed with status ${response.status}`,
      'PAIRING_FAILED',
      body,
    )
  }

  return response.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initiates the OAuth pairing flow:
 * 1. Calls the local API route (GET /api/auth/pairing), which generates a
 *    sessionId + state, opens the browser server-side, and returns the values.
 * Returns a PairingSession in 'pending' status.
 */
export async function initiatePairing(): Promise<PairingSession> {
  const data = await apiFetch<PairingInitResponse>('', {
    method: 'GET',
  })

  const oauthUrl =
    data.oauthUrl ||
    `${NSELF_ORG_BASE}/oauth/pair?session=${data.sessionId}&state=${data.state}`
  // oauthUrl is consumed server-side (browser already opened); stored in
  // session for diagnostic use only.
  void oauthUrl

  const session: PairingSession = {
    sessionId: data.sessionId,
    state: data.state,
    expiresAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
    status: 'pending',
  }

  return session
}

/**
 * Polls /api/auth/pairing/status until the session is paired or expired.
 * Resolves with the final PairingSession; rejects on network errors.
 */
export async function pollPairingStatus(
  sessionId: string,
): Promise<PairingSession & { token?: AuthToken }> {
  let attempts = 0

  return new Promise((resolve, reject) => {
    const tick = async () => {
      attempts++

      let data: PairingStatusResponse
      try {
        data = await apiFetch<PairingStatusResponse>(
          `/status?sessionId=${encodeURIComponent(sessionId)}`,
        )
      } catch (err) {
        reject(err)
        return
      }

      if (data.status === 'paired') {
        resolve({
          sessionId,
          state: '',
          expiresAt: data.token?.expiresAt ?? new Date().toISOString(),
          status: 'paired',
          token: data.token,
        })
        return
      }

      if (data.status === 'expired') {
        reject(
          makePairingError(
            'Pairing session expired',
            'PAIRING_EXPIRED',
            `Session ${sessionId} expired before pairing completed`,
          ),
        )
        return
      }

      if (attempts >= POLL_MAX_ATTEMPTS) {
        reject(
          makePairingError(
            'Pairing timed out',
            'PAIRING_EXPIRED',
            `Exceeded ${POLL_MAX_ATTEMPTS} polling attempts`,
          ),
        )
        return
      }

      setTimeout(tick, POLL_INTERVAL_MS)
    }

    setTimeout(tick, POLL_INTERVAL_MS)
  })
}

/**
 * Stores an AuthToken in the OS keychain via the server-side keychain API.
 */
export async function storeTokenInKeychain(token: AuthToken): Promise<void> {
  await apiFetch<{ ok: boolean }>('/keychain', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

/**
 * Retrieves the stored AuthToken from the OS keychain via the server-side
 * keychain API. Returns null if no token is found.
 */
export async function retrieveTokenFromKeychain(): Promise<AuthToken | null> {
  const data = await apiFetch<{ token: AuthToken | null }>('/keychain')
  return data.token
}

/**
 * Removes the stored token from the OS keychain via the server-side keychain
 * API.
 */
export async function clearKeychain(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/keychain', { method: 'DELETE' })
}

/**
 * Returns the KeychainEntry metadata (without the token value).
 */
export function getKeychainEntryMeta(): KeychainEntry {
  return {
    service: KEYCHAIN_SERVICE,
    account: KEYCHAIN_ACCOUNT,
    token: '(stored in OS keychain)',
  }
}
