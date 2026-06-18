/**
 * DeploymentUIPanel — multi-environment deployment control panel.
 *
 * Purpose: Let admins switch between local/staging/prod environments and
 *   view the deployment status timeline. All 7 AsyncScreen states handled.
 * Inputs: env switcher selection, /api/deploy/status endpoint
 * Outputs: multi-env switcher + deployment status timeline
 * Constraints:
 *   - Offline = stack not running
 *   - Permission-denied = session expired → login overlay
 *   - Empty = no deployments recorded yet
 *   - Error = fetch failure
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: DeploymentUIPanel 7-state
 */

'use client'

import { AdminLoginOverlay } from '@/components/AdminLoginOverlay'
import { AsyncScreen, type AsyncScreenState } from '@/components/AsyncScreen'
import { err, ok, toAdminError, type Result } from '@/lib/result'
import { CheckCircle2, Circle, Clock, Loader2, Rocket, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useStackStatus } from '@/hooks/useStackStatus'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Env = 'local' | 'staging' | 'prod'

interface DeploymentStep {
  name: string
  status: 'pending' | 'running' | 'done' | 'failed'
  timestamp?: string
}

interface DeploymentStatus {
  env: Env
  version: string
  steps: DeploymentStep[]
  lastDeployedAt?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENV_LABELS: Record<Env, string> = {
  local: 'Local',
  staging: 'Staging',
  prod: 'Production',
}

function stepIcon(status: DeploymentStep['status']) {
  switch (status) {
    case 'done':    return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'failed':  return <XCircle className="h-4 w-4 text-red-500" />
    case 'running': return <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
    case 'pending': return <Circle className="h-4 w-4 text-zinc-300 dark:text-zinc-600" />
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeploymentUIPanel() {
  const { stackIsDown, retry } = useStackStatus()
  const [activeEnv, setActiveEnv] = useState<Env>('local')
  const [result, setResult] = useState<Result<DeploymentStatus> | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  const fetchStatus = useCallback(async (env: Env) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/deploy/status?env=${env}`)
      if (res.status === 401) { setSessionExpired(true); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: DeploymentStatus = await res.json()
      setResult(ok(data))
    } catch (e) {
      setResult(err(toAdminError(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!stackIsDown) fetchStatus(activeEnv)
  }, [fetchStatus, stackIsDown, activeEnv])

  // ---------------------------------------------------------------------------
  // Derive state
  // ---------------------------------------------------------------------------

  const screenState: AsyncScreenState = (() => {
    if (stackIsDown) return 'offline'
    if (sessionExpired) return 'auth-expired'
    if (loading) return 'loading'
    if (!result) return 'loading'
    if (!result.ok) return 'error'
    if (result.value.steps.length === 0) return 'empty'
    return 'ready'
  })()

  const status = result?.ok ? result.value : null

  return (
    <section aria-label="Deployment UI" className="space-y-6">
      {sessionExpired && (
        <AdminLoginOverlay
          onSuccess={() => {
            setSessionExpired(false)
            fetchStatus(activeEnv)
          }}
        />
      )}

      {/* Environment switcher */}
      <div
        role="tablist"
        aria-label="Select environment"
        className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {(['local', 'staging', 'prod'] as Env[]).map((env) => (
          <button
            key={env}
            role="tab"
            aria-selected={activeEnv === env}
            onClick={() => {
              setActiveEnv(env)
              setResult(null)
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeEnv === env
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {ENV_LABELS[env]}
          </button>
        ))}
      </div>

      {/* Status timeline */}
      <AsyncScreen
        state={screenState}
        onRetry={retry}
        onReauth={() => setSessionExpired(true)}
        onErrorRetry={() => fetchStatus(activeEnv)}
        errorMessage={result && !result.ok ? result.error.userMessage : undefined}
        emptyMessage="No deployment history for this environment."
      >
        {status && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Rocket className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  {ENV_LABELS[status.env]} — {status.version}
                </p>
                {status.lastDeployedAt && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Last deployed {new Date(status.lastDeployedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <ol className="space-y-2">
              {status.steps.map((step, i) => (
                <li key={i} className="flex items-center gap-3">
                  {stepIcon(step.status)}
                  <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {step.name}
                  </span>
                  {step.timestamp && (
                    <span className="text-xs text-zinc-400">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </AsyncScreen>
    </section>
  )
}
