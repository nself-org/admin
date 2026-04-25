'use client'

import { CircuitState } from './types'

interface HealthBadgeProps {
  score: number // 0-100
  circuitState: CircuitState
  className?: string
}

/**
 * HealthBadge displays a 0-100 numeric health score for a webhook endpoint
 * alongside a colour-coded dot indicating the circuit breaker state.
 *
 * Colour mapping:
 *   score >= 80 && closed  → green
 *   score >= 50 || half-open → amber
 *   score <  50 || open    → red
 */
export function HealthBadge({
  score,
  circuitState,
  className = '',
}: HealthBadgeProps) {
  const colour = (() => {
    if (circuitState === 'open') return 'red'
    if (circuitState === 'half-open') return 'amber'
    if (score >= 80) return 'green'
    if (score >= 50) return 'amber'
    return 'red'
  })()

  const dotClass =
    colour === 'green'
      ? 'bg-emerald-500'
      : colour === 'amber'
        ? 'bg-amber-500'
        : 'bg-red-500'

  const textClass =
    colour === 'green'
      ? 'text-emerald-700 dark:text-emerald-400'
      : colour === 'amber'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-red-700 dark:text-red-400'

  const bgClass =
    colour === 'green'
      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
      : colour === 'amber'
        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'

  const circuitLabel = {
    closed: 'Healthy',
    'half-open': 'Probing',
    open: 'Open',
  }[circuitState]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${bgClass} ${textClass} ${className}`}
      title={`Health: ${score}/100 | Circuit: ${circuitState}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotClass}`}
        aria-hidden="true"
      />
      <span>{score}/100</span>
      <span className="opacity-60">·</span>
      <span>{circuitLabel}</span>
    </span>
  )
}
