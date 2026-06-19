/**
 * GrafanaPanel — admin Grafana integration panel.
 *
 * Purpose: Embed the Grafana dashboard for nSelf metrics monitoring.
 *   All 7 AsyncScreen states handled.
 * Inputs: /api/grafana/url endpoint (returns the Grafana dashboard URL)
 * Outputs: iframe with Grafana dashboard; fallback states
 * Constraints:
 *   - Offline = stack not running (Grafana service unavailable)
 *   - Empty not expected (Grafana is always part of the nSelf stack)
 *   - Error = Grafana service down or URL unavailable
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: GrafanaPanel 7-state
 */

'use client'

import { AdminLoginOverlay } from '@/components/AdminLoginOverlay'
import { AsyncScreen, type AsyncScreenState } from '@/components/AsyncScreen'
import { useStackStatus } from '@/hooks/useStackStatus'
import { err, ok, toAdminError, type Result } from '@/lib/result'
import { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrafanaConfig {
  dashboardUrl: string
  orgId?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GrafanaPanel() {
  const { stackIsDown, retry } = useStackStatus()
  const [result, setResult] = useState<Result<GrafanaConfig> | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  const fetchGrafana = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/grafana/url')
      if (res.status === 401) {
        setSessionExpired(true)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: GrafanaConfig = await res.json()
      setResult(ok(data))
    } catch (e) {
      setResult(err(toAdminError(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!stackIsDown) fetchGrafana()
  }, [fetchGrafana, stackIsDown])

  const screenState: AsyncScreenState = (() => {
    if (stackIsDown) return 'offline'
    if (sessionExpired) return 'auth-expired'
    if (loading) return 'loading'
    if (!result) return 'loading'
    if (!result.ok) return 'error'
    return 'ready'
  })()

  const grafana = result?.ok ? result.value : null

  return (
    <section aria-label="Grafana Monitoring" className="space-y-4">
      {sessionExpired && (
        <AdminLoginOverlay
          onSuccess={() => {
            setSessionExpired(false)
            fetchGrafana()
          }}
        />
      )}

      <AsyncScreen
        state={screenState}
        onRetry={retry}
        onReauth={() => setSessionExpired(true)}
        onErrorRetry={fetchGrafana}
        errorMessage={result && !result.ok ? result.error.userMessage : undefined}
      >
        {grafana && (
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Grafana Metrics Dashboard
              </p>
              <a
                href={grafana.dashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Open in new tab
              </a>
            </div>
            <iframe
              src={grafana.dashboardUrl}
              title="Grafana Dashboard"
              className="h-[600px] w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
      </AsyncScreen>
    </section>
  )
}
