'use client'

import { useCallback, useEffect, useState } from 'react'

import { retrieveTokenFromKeychain } from './pairing'
import { PairingScreen } from './PairingScreen'
import { getCurrentSession, refreshSession } from './session'
import type { AuthToken } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GuardState = 'checking' | 'paired' | 'unpaired'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface PairingGuardProps {
  children: React.ReactNode
}

/**
 * Wraps page content and enforces an active pairing session.
 *
 * - Checks the keychain for a stored token on mount.
 * - If none found: renders PairingScreen.
 * - If found but near/at expiry: attempts a refresh; on failure shows PairingScreen.
 * - If valid session confirmed: renders children.
 */
export function PairingGuard({ children }: PairingGuardProps) {
  const [guardState, setGuardState] = useState<GuardState>('checking')

  const checkSession = useCallback(async () => {
    setGuardState('checking')

    // 1. Quick keychain lookup — if nothing is stored, go straight to pairing.
    const raw = await retrieveTokenFromKeychain()
    if (!raw) {
      setGuardState('unpaired')
      return
    }

    // 2. Ask session layer for a validated (non-expired) token.
    const active = await getCurrentSession()
    if (active) {
      setGuardState('paired')
      return
    }

    // 3. Token exists but is expired — attempt refresh.
    try {
      await refreshSession(raw)
      setGuardState('paired')
    } catch {
      // Refresh failed; send user through pairing flow.
      setGuardState('unpaired')
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  const handlePaired = useCallback((_token: AuthToken) => {
    setGuardState('paired')
  }, [])

  if (guardState === 'checking') {
    return (
      <div className="bg-nself-bg flex min-h-screen items-center justify-center">
        <span className="nself-gradient-text text-sm font-medium">
          Checking session...
        </span>
      </div>
    )
  }

  if (guardState === 'unpaired') {
    return (
      <div className="bg-nself-bg flex min-h-screen items-center justify-center">
        <PairingScreen onPaired={handlePaired} />
      </div>
    )
  }

  return <>{children}</>
}
