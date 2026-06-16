/**
 * useStackStatus — polls the nSelf stack health endpoint and signals when
 * the stack goes offline or comes back online.
 *
 * Purpose: Drive the "offline" UI state across all 9 admin panels.
 *   When the nSelf stack is not running, admin panels cannot function;
 *   this hook provides a single source of truth for stack availability.
 * Inputs: none (reads NEXT_PUBLIC_NSELF_HEALTH_URL or falls back to
 *   localhost:8080/health)
 * Outputs: { stackIsDown, checking, retry }
 * Constraints:
 *   - Must see 2 consecutive failures before setting stackIsDown=true.
 *     This prevents false positives from a single request timeout.
 *   - On success, stackIsDown resets to false immediately.
 *   - Polls every POLL_INTERVAL ms; stops polling on unmount.
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: useStackStatus hook
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const POLL_INTERVAL = 5_000 // 5 s polling cadence
const FAILURE_THRESHOLD = 2  // consecutive failures before flagging offline
const HEALTH_URL =
  process.env.NEXT_PUBLIC_NSELF_HEALTH_URL ?? 'http://localhost:8080/health'

export interface UseStackStatusResult {
  /** true when 2+ consecutive health-check failures have been observed. */
  stackIsDown: boolean
  /** true while the current health-check request is in flight. */
  checking: boolean
  /** Manually trigger an immediate health check (e.g. from a [Check again] button). */
  retry: () => void
}

export function useStackStatus(): UseStackStatusResult {
  const [stackIsDown, setStackIsDown] = useState(false)
  const [checking, setChecking] = useState(false)

  // Track consecutive failure count without triggering re-renders per increment.
  const failureCountRef = useRef(0)
  const isMountedRef = useRef(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const check = useCallback(async () => {
    if (!isMountedRef.current) return
    setChecking(true)
    try {
      const res = await fetch(HEALTH_URL, {
        method: 'GET',
        // Short timeout so we detect a down stack quickly.
        signal: AbortSignal.timeout(3_000),
        cache: 'no-store',
      })
      if (res.ok) {
        failureCountRef.current = 0
        if (isMountedRef.current) setStackIsDown(false)
      } else {
        throw new Error(`HTTP ${res.status}`)
      }
    } catch {
      failureCountRef.current += 1
      if (isMountedRef.current && failureCountRef.current >= FAILURE_THRESHOLD) {
        setStackIsDown(true)
      }
    } finally {
      if (isMountedRef.current) setChecking(false)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    // Immediate first check on mount.
    check()

    intervalRef.current = setInterval(check, POLL_INTERVAL)

    return () => {
      isMountedRef.current = false
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
      }
    }
  }, [check])

  return { stackIsDown, checking, retry: check }
}
