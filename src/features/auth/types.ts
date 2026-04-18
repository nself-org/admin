/**
 * Auth/Pairing feature types for nSelf Admin.
 * Handles OAuth browser handshake + OS keychain token storage.
 */

export interface PairingSession {
  sessionId: string
  state: string
  expiresAt: string
  status: 'pending' | 'paired' | 'expired'
}

export interface AuthToken {
  accessToken: string
  refreshToken: string
  expiresAt: string
  userId: string
  email: string
}

export interface KeychainEntry {
  service: string
  account: string
  token: string
}

export interface PairingInitResponse {
  sessionId: string
  state: string
  oauthUrl: string
}

export interface PairingStatusResponse {
  sessionId: string
  status: 'pending' | 'paired' | 'expired'
  token?: AuthToken
}

export interface PairingError extends Error {
  code:
    | 'PAIRING_EXPIRED'
    | 'PAIRING_FAILED'
    | 'KEYCHAIN_ERROR'
    | 'NETWORK_ERROR'
    | 'INVALID_STATE'
    | 'REFRESH_FAILED'
    | 'REVOKE_FAILED'
  details?: string
}

export type PairingStatus =
  | 'idle'
  | 'initiating'
  | 'polling'
  | 'paired'
  | 'error'
