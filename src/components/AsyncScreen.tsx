/**
 * AsyncScreen — 7-state UI contract for all admin panels.
 *
 * Purpose: Enforce consistent handling of all async states so no panel can
 *   silently leave the user staring at blank content.
 * Inputs: props for each of the 7 states (see AsyncScreenProps).
 * Outputs: renders the appropriate state layer; children only when ready.
 * Constraints:
 *   - Exactly 7 states: loading | offline | auth-expired | error |
 *     empty | rate-limited | ready
 *   - "offline" = nSelf stack not running (stackIsDown from useStackStatus)
 *   - "auth-expired" = LokiJS 24h session ended → show login overlay
 *   - Children ONLY render in the "ready" state.
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: 7-state AsyncScreen contract
 */

'use client'

import {
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw,
  ServerCrash,
  ShieldOff,
  WifiOff,
} from 'lucide-react'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AsyncScreenState =
  | 'loading'
  | 'offline'
  | 'auth-expired'
  | 'error'
  | 'empty'
  | 'rate-limited'
  | 'ready'

export interface AsyncScreenProps {
  /** Current derived state for this panel. */
  state: AsyncScreenState
  /** Content to render when state === 'ready'. */
  children: ReactNode
  /** Shown in the error card (state === 'error'). */
  errorMessage?: string
  /** Shown in the empty state (state === 'empty'). */
  emptyMessage?: string
  /** CTA label for the empty-state action button. */
  emptyAction?: string
  /** Called when the user clicks the empty-state action. */
  onEmptyAction?: () => void
  /** Called when the user clicks the [Check again] button (offline state). */
  onRetry?: () => void
  /** Called when the user clicks [Retry] in the error state. */
  onErrorRetry?: () => void
  /** Called when the user clicks [Log in again] in the auth-expired state. */
  onReauth?: () => void
  /** Seconds remaining until rate-limit window resets (state === 'rate-limited'). */
  rateLimitResetSeconds?: number
}

// ---------------------------------------------------------------------------
// Sub-state components
// ---------------------------------------------------------------------------

function StateCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
      {children}
    </div>
  )
}

function StateIcon({ icon: Icon, className }: { icon: React.ElementType; className?: string }) {
  return <Icon className={`h-10 w-10 ${className ?? 'text-zinc-400'}`} />
}

function StateTitle({ children }: { children: ReactNode }) {
  return <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">{children}</p>
}

function StateBody({ children }: { children: ReactNode }) {
  return <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{children}</p>
}

function ActionButton({
  onClick,
  children,
  variant = 'secondary',
}: {
  onClick?: () => void
  children: ReactNode
  variant?: 'primary' | 'secondary'
}) {
  const base =
    'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500'
  const styles = {
    primary: `${base} bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300`,
    secondary: `${base} border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800`,
  }
  return (
    <button onClick={onClick} className={styles[variant]}>
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Individual state views
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <StateCard>
      <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
      <StateTitle>Loading…</StateTitle>
    </StateCard>
  )
}

function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <StateCard>
      <StateIcon icon={ServerCrash} className="text-orange-500" />
      <StateTitle>nSelf stack offline</StateTitle>
      <StateBody>
        The nSelf stack is not running.{' '}
        <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
          nself start
        </code>{' '}
        in your terminal to bring it up.
      </StateBody>
      <ActionButton onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Check again
      </ActionButton>
    </StateCard>
  )
}

function AuthExpiredState({ onReauth }: { onReauth?: () => void }) {
  return (
    <StateCard>
      <StateIcon icon={ShieldOff} className="text-red-500" />
      <StateTitle>Session expired</StateTitle>
      <StateBody>
        Your admin session has expired (24-hour limit). Log in again to continue.
      </StateBody>
      <ActionButton onClick={onReauth} variant="primary">
        Log in again
      </ActionButton>
    </StateCard>
  )
}

function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <StateCard>
      <StateIcon icon={AlertCircle} className="text-red-500" />
      <StateTitle>Something went wrong</StateTitle>
      <StateBody>{message ?? 'An unexpected error occurred. Try again.'}</StateBody>
      {onRetry && (
        <ActionButton onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </ActionButton>
      )}
    </StateCard>
  )
}

function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <StateCard>
      <StateIcon icon={WifiOff} className="text-zinc-300 dark:text-zinc-600" />
      <StateTitle>Nothing here yet</StateTitle>
      <StateBody>{message ?? 'No data to display.'}</StateBody>
      {actionLabel && onAction && (
        <ActionButton onClick={onAction} variant="primary">
          {actionLabel}
        </ActionButton>
      )}
    </StateCard>
  )
}

function RateLimitedState({ resetSeconds }: { resetSeconds?: number }) {
  return (
    <StateCard>
      <StateIcon icon={Clock} className="text-amber-500" />
      <StateTitle>Rate limited</StateTitle>
      <StateBody>
        Too many requests.{' '}
        {resetSeconds !== undefined
          ? `Try again in ${resetSeconds}s.`
          : 'Please wait a moment before retrying.'}
      </StateBody>
    </StateCard>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AsyncScreen({
  state,
  children,
  errorMessage,
  emptyMessage,
  emptyAction,
  onEmptyAction,
  onRetry,
  onErrorRetry,
  onReauth,
  rateLimitResetSeconds,
}: AsyncScreenProps) {
  switch (state) {
    case 'loading':
      return <LoadingState />
    case 'offline':
      return <OfflineState onRetry={onRetry} />
    case 'auth-expired':
      return <AuthExpiredState onReauth={onReauth} />
    case 'error':
      return <ErrorState message={errorMessage} onRetry={onErrorRetry} />
    case 'empty':
      return (
        <EmptyState message={emptyMessage} actionLabel={emptyAction} onAction={onEmptyAction} />
      )
    case 'rate-limited':
      return <RateLimitedState resetSeconds={rateLimitResetSeconds} />
    case 'ready':
      return <>{children}</>
  }
}
