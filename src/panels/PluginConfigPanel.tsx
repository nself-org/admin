/**
 * PluginConfigPanel — admin panel for per-plugin configuration.
 *
 * Purpose: Let admins view and configure all installed nSelf plugins.
 *   All 7 AsyncScreen states handled.
 * Inputs: /api/plugins/config endpoint
 * Outputs: list of plugins with enabled/disabled toggle and config summary
 * Constraints:
 *   - Offline = stack not running
 *   - Empty = no plugins installed (unlikely but handled)
 *   - Error = plugin config fetch failure
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: PluginConfigPanel 7-state
 */

'use client'

import { AdminLoginOverlay } from '@/components/AdminLoginOverlay'
import { AsyncScreen, type AsyncScreenState } from '@/components/AsyncScreen'
import { useStackStatus } from '@/hooks/useStackStatus'
import { err, ok, toAdminError, type Result } from '@/lib/result'
import { Package, ToggleLeft, ToggleRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PluginConfig {
  id: string
  name: string
  version: string
  enabled: boolean
  tier: 'free' | 'paid'
  description: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PluginConfigPanel() {
  const { stackIsDown, retry } = useStackStatus()
  const [result, setResult] = useState<Result<PluginConfig[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchPlugins = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/plugins/config')
      if (res.status === 401) {
        setSessionExpired(true)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: { plugins: PluginConfig[] } = await res.json()
      setResult(ok(data.plugins))
    } catch (e) {
      setResult(err(toAdminError(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!stackIsDown) fetchPlugins()
  }, [fetchPlugins, stackIsDown])

  const togglePlugin = useCallback(async (id: string, enabled: boolean) => {
    setToggling(id)
    try {
      const res = await fetch(`/api/plugins/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (res.status === 401) {
        setSessionExpired(true)
        return
      }
      if (!res.ok) return
      // Optimistic update
      setResult((prev) => {
        if (!prev?.ok) return prev
        return ok(prev.value.map((p) => (p.id === id ? { ...p, enabled } : p)))
      })
    } finally {
      setToggling(null)
    }
  }, [])

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

  const plugins = result?.ok ? result.value : []

  return (
    <section aria-label="Plugin Configuration" className="space-y-4">
      {sessionExpired && (
        <AdminLoginOverlay
          onSuccess={() => {
            setSessionExpired(false)
            fetchPlugins()
          }}
        />
      )}

      <AsyncScreen
        state={screenState}
        onRetry={retry}
        onReauth={() => setSessionExpired(true)}
        onErrorRetry={fetchPlugins}
        errorMessage={result && !result.ok ? result.error.userMessage : undefined}
        emptyMessage="No plugins installed."
      >
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {plugins.map((plugin) => (
            <li key={plugin.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-zinc-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {plugin.name}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        plugin.tier === 'paid'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {plugin.tier}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{plugin.description}</p>
                </div>
              </div>
              <button
                onClick={() => togglePlugin(plugin.id, !plugin.enabled)}
                disabled={toggling === plugin.id}
                aria-label={`${plugin.enabled ? 'Disable' : 'Enable'} ${plugin.name}`}
                className="text-zinc-400 transition-colors hover:text-zinc-600 disabled:cursor-not-allowed dark:hover:text-zinc-200"
              >
                {plugin.enabled ? (
                  <ToggleRight className="h-6 w-6 text-green-500" />
                ) : (
                  <ToggleLeft className="h-6 w-6" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </AsyncScreen>
    </section>
  )
}
