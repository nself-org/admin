'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import type { Environment, SyncOperation } from '@/types/deployment'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Clock,
  History,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

type SyncUIState = 'loading' | 'empty' | 'error' | 'data'

function SyncContent() {
  const [uiState, setUiState] = useState<SyncUIState>('loading')
  const [_loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sourceEnv, setSourceEnv] = useState<Environment>('staging')
  const [targetEnv, setTargetEnv] = useState<Environment>('production')
  const [recentSyncs, setRecentSyncs] = useState<SyncOperation[]>([])
  const [syncOptions, setSyncOptions] = useState({
    variables: true,
    secrets: false,
    services: true,
    dryRun: true,
  })

  const environments: Environment[] = ['local', 'development', 'staging', 'production']

  const fetchRecentSyncs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sync')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as {
        history?: SyncOperation[]
        recentSyncs?: SyncOperation[]
      }
      const history: SyncOperation[] = data.history ?? data.recentSyncs ?? []
      setRecentSyncs(history)
      setUiState(history.length === 0 ? 'empty' : 'data')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sync history')
      setUiState('error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecentSyncs()
  }, [fetchRecentSyncs])

  const executeSync = async () => {
    setSyncing(true)
    setSyncSuccess(null)
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: sourceEnv,
          target: targetEnv,
          options: syncOptions,
        }),
      })
      if (res.ok) {
        const label = syncOptions.dryRun ? 'Dry run' : 'Sync'
        setSyncSuccess(`${label} from ${sourceEnv} → ${targetEnv} completed`)
        setTimeout(() => setSyncSuccess(null), 4000)
      }
      await fetchRecentSyncs()
    } finally {
      setSyncing(false)
    }
  }

  if (uiState === 'loading') {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          </div>
        </div>
      </>
    )
  }

  if (uiState === 'error') {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
            <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
              Failed to load sync history
            </h2>
            <p className="mb-6 text-zinc-500 dark:text-zinc-400">{error}</p>
            <button
              onClick={() => fetchRecentSyncs()}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        {syncSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {syncSuccess}
          </div>
        )}

        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-teal-600 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent dark:from-teal-400 dark:to-cyan-300">
                Environment Sync
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Synchronize configurations between environments
              </p>
            </div>
            <Link
              href="/sync/history"
              className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <History className="h-4 w-4" />
              View History
            </Link>
          </div>
        </div>

        {/* Sync Configuration */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-white">
            Sync Configuration
          </h3>

          {/* Environment Selection */}
          <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
            <div className="min-w-[180px]">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Source
              </label>
              <div className="relative">
                <select
                  value={sourceEnv}
                  onChange={(e) => setSourceEnv(e.target.value as Environment)}
                  className="w-full appearance-none rounded-lg border border-zinc-300 bg-white px-4 py-2.5 pr-10 text-zinc-900 capitalize focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                >
                  {environments
                    .filter((e) => e !== targetEnv)
                    .map((env) => (
                      <option key={env} value={env}>
                        {env}
                      </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>

            <ArrowRight className="mt-6 h-6 w-6 text-zinc-400" />

            <div className="min-w-[180px]">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Target
              </label>
              <div className="relative">
                <select
                  value={targetEnv}
                  onChange={(e) => setTargetEnv(e.target.value as Environment)}
                  className="w-full appearance-none rounded-lg border border-zinc-300 bg-white px-4 py-2.5 pr-10 text-zinc-900 capitalize focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                >
                  {environments
                    .filter((e) => e !== sourceEnv)
                    .map((env) => (
                      <option key={env} value={env}>
                        {env}
                      </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Sync Options */}
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={syncOptions.variables}
                  onChange={(e) =>
                    setSyncOptions({
                      ...syncOptions,
                      variables: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  Sync environment variables
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={syncOptions.secrets}
                  onChange={(e) =>
                    setSyncOptions({
                      ...syncOptions,
                      secrets: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Sync secrets</span>
                {syncOptions.secrets && (
                  <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    Requires elevated permissions
                  </span>
                )}
              </label>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={syncOptions.services}
                  onChange={(e) =>
                    setSyncOptions({
                      ...syncOptions,
                      services: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  Sync service versions
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={syncOptions.dryRun}
                  onChange={(e) => setSyncOptions({ ...syncOptions, dryRun: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  Dry run (preview changes)
                </span>
              </label>
            </div>
          </div>

          {/* Warning for production */}
          {targetEnv === 'production' && !syncOptions.dryRun && (
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-300">
                  Production Warning
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  You are about to sync changes to production. Please ensure all changes have been
                  tested in staging first.
                </p>
              </div>
            </div>
          )}

          {/* Execute Button */}
          <button
            onClick={executeSync}
            disabled={syncing}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {syncing ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" />
                {syncOptions.dryRun ? 'Preview Sync' : 'Execute Sync'}
              </>
            )}
          </button>
        </div>

        {/* Recent Syncs */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Recent Sync Operations
          </h3>
          {uiState === 'empty' ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                No sync operations yet
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Run your first sync above to see history here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSyncs.map((sync) => (
                <div
                  key={sync.id}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="mb-2 flex items-center gap-3">
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-sm font-medium text-zinc-700 capitalize dark:bg-zinc-700 dark:text-zinc-300">
                          {sync.source}
                        </span>
                        <ArrowRight className="h-4 w-4 text-zinc-400" />
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-sm font-medium text-zinc-700 capitalize dark:bg-zinc-700 dark:text-zinc-300">
                          {sync.target}
                        </span>
                        {sync.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : sync.status === 'failed' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                      </div>
                      {sync.changes && (
                        <div className="flex gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                          <span>{sync.changes.variables} variables</span>
                          <span>{sync.changes.secrets} secrets</span>
                          <span>{sync.changes.services} services</span>
                        </div>
                      )}
                      {sync.error && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{sync.error}</p>
                      )}
                    </div>
                    <div className="text-right text-sm text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(sync.startedAt).toLocaleString()}
                      </div>
                      <p className="mt-1">{sync.syncedBy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-teal-500">nself sync staging prod</span> - Sync staging to
              production
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-teal-500">nself sync staging prod --dry-run</span> - Preview
              changes
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-teal-500">nself sync staging prod --include-secrets</span> -
              Include secrets
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-teal-500">nself sync --history</span> - View sync history
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function SyncPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SyncContent />
    </Suspense>
  )
}
