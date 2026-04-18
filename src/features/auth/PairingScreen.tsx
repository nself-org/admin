'use client'

import { AlertTriangle, CheckCircle, Loader2, XCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  initiatePairing,
  pollPairingStatus,
  storeTokenInKeychain,
} from './pairing'
import type {
  AuthToken,
  PairingError,
  PairingSession,
  PairingStatus,
} from './types'

// ---------------------------------------------------------------------------
// Error message map
// ---------------------------------------------------------------------------

function errorMessageFor(err: PairingError): string {
  switch (err.code) {
    case 'PAIRING_EXPIRED': {
      return 'The pairing session expired before the browser handshake completed. Please try again.'
    }
    case 'PAIRING_FAILED': {
      return 'Pairing failed. Check that your nself.org account is active and try again.'
    }
    case 'KEYCHAIN_ERROR': {
      return 'Unable to save your credentials to the system keychain. Check keychain permissions and try again.'
    }
    case 'NETWORK_ERROR': {
      return 'A network error occurred. Verify this admin panel can reach nself.org and try again.'
    }
    case 'INVALID_STATE': {
      return 'The pairing handshake returned an invalid state. Please try again.'
    }
    case 'REFRESH_FAILED': {
      return 'Your session could not be refreshed. Please reconnect your account.'
    }
    case 'REVOKE_FAILED': {
      return 'Session revocation failed. Your local token has been cleared anyway.'
    }
    default: {
      return err.message || 'An unexpected error occurred. Please try again.'
    }
  }
}

// ---------------------------------------------------------------------------
// Sub-state panels
// ---------------------------------------------------------------------------

function IdlePanel({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="glass-card-glow flex flex-col items-center gap-6 px-10 py-12 text-center">
      {/* Brand mark */}
      <div className="nself-gradient flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg">
        <span className="text-3xl font-black tracking-tighter text-white select-none">
          ɳ
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-nself-text text-2xl font-bold">Connect to nSelf</h1>
        <p className="text-nself-text-muted max-w-sm text-sm leading-relaxed">
          Pair this admin panel with your nself.org account to manage your
          project.
        </p>
      </div>

      <button
        onClick={onConnect}
        className="nself-btn-primary px-8 py-2.5 text-sm font-semibold"
        type="button"
      >
        Connect Account
      </button>
    </div>
  )
}

function InitiatingPanel({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="glass-card flex flex-col items-center gap-6 px-10 py-12 text-center">
      <Loader2 className="text-nself-primary h-12 w-12 animate-spin" />

      <div className="flex flex-col gap-2">
        <h2 className="text-nself-text text-lg font-semibold">
          Opening browser...
        </h2>
        <p className="text-nself-text-muted text-sm">
          A browser window will open for you to sign in to nself.org.
        </p>
      </div>

      <button
        onClick={onCancel}
        className="text-nself-text-muted text-sm underline-offset-2 hover:underline"
        type="button"
      >
        Cancel
      </button>
    </div>
  )
}

function PollingPanel({
  elapsedSeconds,
  onCancel,
}: {
  elapsedSeconds: number
  onCancel: () => void
}) {
  return (
    <div className="glass-card flex flex-col items-center gap-6 px-10 py-12 text-center">
      {/* Pulsing ring indicator */}
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="bg-nself-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-30" />
        <span className="bg-nself-primary relative inline-flex h-10 w-10 items-center justify-center rounded-full">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-nself-text text-lg font-semibold">
          Waiting for browser confirmation...
        </h2>
        <p className="text-nself-text-muted text-sm">
          Complete the sign-in in the browser window that opened.
        </p>
        <p className="text-nself-text-muted font-mono text-xs">
          {elapsedSeconds}s elapsed
        </p>
      </div>

      <button
        onClick={onCancel}
        className="text-nself-text-muted text-sm underline-offset-2 hover:underline"
        type="button"
      >
        Cancel
      </button>
    </div>
  )
}

function PairedPanel({
  token,
  onContinue,
}: {
  token: AuthToken
  onContinue: () => void
}) {
  return (
    <div className="glass-card flex flex-col items-center gap-6 px-10 py-12 text-center">
      <CheckCircle className="h-14 w-14 text-green-400" />

      <div className="flex flex-col gap-2">
        <h2 className="text-nself-text text-2xl font-bold">Connected!</h2>
        <p className="text-nself-text-muted text-sm">
          Signed in as{' '}
          <span className="text-nself-text font-medium">{token.email}</span>
        </p>
      </div>

      <button
        onClick={onContinue}
        className="nself-btn-primary px-8 py-2.5 text-sm font-semibold"
        type="button"
      >
        Continue to Dashboard
      </button>
    </div>
  )
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="glass-card flex flex-col items-center gap-6 px-10 py-12 text-center">
      <AlertTriangle className="h-14 w-14 text-red-400" />

      <div className="flex flex-col gap-2">
        <h2 className="text-nself-text text-lg font-semibold">
          Connection failed
        </h2>
        <p className="text-nself-text-muted max-w-sm text-sm leading-relaxed">
          {message}
        </p>
      </div>

      <button
        onClick={onRetry}
        className="nself-btn-primary px-8 py-2.5 text-sm font-semibold"
        type="button"
      >
        Try Again
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PairingScreenProps {
  /** Called when pairing completes successfully. */
  onPaired?: (token: AuthToken) => void
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PairingScreen({ onPaired }: PairingScreenProps) {
  const [status, setStatus] = useState<PairingStatus>('idle')
  const [session, setSession] = useState<PairingSession | null>(null)
  const [pairedToken, setPairedToken] = useState<AuthToken | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Cancellation flag — set to true to abort the polling loop
  const cancelledRef = useRef(false)

  // Elapsed-seconds ticker
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    setElapsedSeconds(0)
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
  }, [])

  const handleCancel = useCallback(() => {
    cancelledRef.current = true
    clearTimer()
    setStatus('idle')
    setSession(null)
    setElapsedSeconds(0)
  }, [clearTimer])

  const handleConnect = useCallback(async () => {
    cancelledRef.current = false
    setStatus('initiating')
    setErrorMessage('')

    let newSession: PairingSession
    try {
      newSession = await initiatePairing()
    } catch (err) {
      clearTimer()
      const pairingErr = err as PairingError
      setErrorMessage(errorMessageFor(pairingErr))
      setStatus('error')
      return
    }

    if (cancelledRef.current) return

    setSession(newSession)
    setStatus('polling')
    startTimer()

    let result: PairingSession & { token?: AuthToken }
    try {
      result = await pollPairingStatus(newSession.sessionId)
    } catch (err) {
      clearTimer()
      if (cancelledRef.current) return
      const pairingErr = err as PairingError
      setErrorMessage(errorMessageFor(pairingErr))
      setStatus('error')
      return
    }

    clearTimer()
    if (cancelledRef.current) return

    if (!result.token) {
      setErrorMessage(
        'Pairing completed but no token was returned. Please try again.',
      )
      setStatus('error')
      return
    }

    try {
      await storeTokenInKeychain(result.token)
    } catch (err) {
      const pairingErr = err as PairingError
      setErrorMessage(errorMessageFor(pairingErr))
      setStatus('error')
      return
    }

    setPairedToken(result.token)
    setStatus('paired')
  }, [clearTimer, startTimer])

  const handleRetry = useCallback(() => {
    setStatus('idle')
    setSession(null)
    setElapsedSeconds(0)
    setErrorMessage('')
  }, [])

  const handleContinue = useCallback(() => {
    if (pairedToken && onPaired) {
      onPaired(pairedToken)
    }
  }, [pairedToken, onPaired])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true
      clearTimer()
    }
  }, [clearTimer])

  // Suppress unused-variable lint warning for session; it is set and available
  // for future use (e.g. displaying sessionId for debug).
  void session

  return (
    <div className="w-full max-w-md">
      {status === 'idle' && <IdlePanel onConnect={handleConnect} />}
      {status === 'initiating' && <InitiatingPanel onCancel={handleCancel} />}
      {status === 'polling' && (
        <PollingPanel elapsedSeconds={elapsedSeconds} onCancel={handleCancel} />
      )}
      {status === 'paired' && pairedToken && (
        <PairedPanel token={pairedToken} onContinue={handleContinue} />
      )}
      {status === 'error' && (
        <ErrorPanel message={errorMessage} onRetry={handleRetry} />
      )}

      {/* Dismiss icon — always visible in error/idle for accessibility */}
      {status === 'error' && (
        <div className="mt-4 flex justify-center">
          <XCircle
            className="text-nself-text-muted h-4 w-4 opacity-40"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  )
}
