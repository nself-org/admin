/**
 * ServiceHealthPanel — admin panel for nSelf service health monitoring.
 *
 * Purpose: Display all running nSelf services and their health status,
 *   with all 7 AsyncScreen states handled.
 * Inputs: useStackStatus (offline detection), /api/services/health endpoint
 * Outputs: list of service cards with status badges; skeleton while loading
 * Constraints:
 *   - Offline state = stack not running (nSelf cannot report service health)
 *   - Empty state = no services returned from API
 *   - Error = fetch failure (non-offline)
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: ServiceHealthPanel 7-state
 */

'use client'

import { AdminLoginOverlay } from '@/components/AdminLoginOverlay'
import { AsyncScreen, type AsyncScreenState } from '@/components/AsyncScreen'
import { err, ok, toAdminError, type Result } from '@/lib/result'
import { Activity, CheckCircle2, Circle, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useStackStatus } from '@/hooks/useStackStatus'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServiceHealth {
  name: string
  status: 'running' | 'stopped' | 'error' | 'starting'
  uptime?: string
  version?: string
}

interface HealthResponse {
  services: ServiceHealth[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusIcon(status: ServiceHealth['status']) {
  switch (status) {
    case 'running':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'stopped':
      return <Circle className="h-4 w-4 text-zinc-400" />
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'starting':
      return <Activity className="h-4 w-4 animate-pulse text-amber-500" />
  }
}

function statusLabel(status: ServiceHealth['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ServiceHealthPanel() {
  const { stackIsDown, retry } = useStackStatus()
  const [result, setResult] = useState<Result<ServiceHealth[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/services/health')
      if (res.status === 401) {
        setSessionExpired(true)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: HealthResponse = await res.json()
      setResult(ok(data.services))
    } catch (e) {
      setResult(err(toAdminError(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!stackIsDown) fetchHealth()
  }, [fetchHealth, stackIsDown])

  // ---------------------------------------------------------------------------
  // Derive state
  // ---------------------------------------------------------------------------

  const screenState: AsyncScreenState = (() => {
    if (stackIsDown) return 'offline'
    if (sessionExpired) return 'auth-expired'
    if (loading) return 'loading'
    if (!result) return 'loading'
    if (!result.ok) return 'error'
    if (result.value.length === 0) return 'empty'
    return 'ready'
  })()

  const services = result?.ok ? result.value : []

  return (
    <section aria-label="Service Health" className="space-y-4">
      {sessionExpired && (
        <AdminLoginOverlay
          onSuccess={() => {
            setSessionExpired(false)
            fetchHealth()
          }}
        />
      )}

      <AsyncScreen
        state={screenState}
        onRetry={retry}
        onReauth={() => setSessionExpired(true)}
        onErrorRetry={fetchHealth}
        errorMessage={result && !result.ok ? result.error.userMessage : undefined}
        emptyMessage="No services running — run nself start."
        emptyAction="Refresh"
        onEmptyAction={fetchHealth}
      >
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {services.map((svc) => (
            <li
              key={svc.name}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {statusIcon(svc.status)}
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  {svc.name}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                {svc.uptime && <span>Up {svc.uptime}</span>}
                {svc.version && <span>{svc.version}</span>}
                <span
                  className={
                    svc.status === 'running'
                      ? 'text-green-600 dark:text-green-400'
                      : svc.status === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-zinc-400'
                  }
                >
                  {statusLabel(svc.status)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </AsyncScreen>
    </section>
  )
}
