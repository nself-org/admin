'use client'

/**
 * /free-users — Free-plugin cohort table (S20)
 *
 * Shows all devices that registered a nself_free_ key.
 * Columns: key hash (truncated), install count, plugin list, IP flag status, registered at.
 * Filter: All | Flagged | Converted (placeholder — conversion detection is future work).
 *
 * 7 UI states: loading, empty, populated, error, offline, unauthorized, rate-limited.
 */

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Users,
  WifiOff,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'flagged' | 'converted'

interface FreeAccount {
  key_hash_display: string
  install_count: number
  plugin_list: string[] | string
  ip_flag_status: 'ok' | 'flagged'
  created_at: string | null
  // flagged-filter extras
  ip_count?: number
  flagged_at?: string | null
  reviewed?: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function parsePluginList(raw: string[] | string | null | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FlagBadge({ status }: { status: 'ok' | 'flagged' }) {
  if (status === 'flagged') {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
        <ShieldAlert className="h-3 w-3" />
        Flagged
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
      <CheckCircle2 className="h-3 w-3" />
      OK
    </span>
  )
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading free-user accounts">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="mb-3 h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function FreeUsersPage() {
  const [accounts, setAccounts] = useState<FreeAccount[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [cronRunning, setCronRunning] = useState(false)
  const [cronResult, setCronResult] = useState<string | null>(null)

  const fetchAccounts = useCallback(async (f: Filter) => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch(`/api/admin/free-accounts?filter=${f}`)
      if (res.status === 401 || res.status === 403) {
        setError('Unauthorized — check your admin credentials.')
        return
      }
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After') ?? '60'
        setError(`Rate limited. Retry in ${retryAfter}s.`)
        return
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Failed to load free accounts.')
        return
      }
      const json = await res.json()
      setAccounts(json.data || [])
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts(filter)
  }, [fetchAccounts, filter])

  const handleRunCron = useCallback(async () => {
    setCronRunning(true)
    setCronResult(null)
    try {
      const res = await fetch('/api/admin/free-accounts/run-antisharing-cron', {
        method: 'POST',
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setCronResult(
          `Anti-sharing cron complete: ${json.flagged ?? 0} key(s) flagged.`,
        )
        fetchAccounts(filter)
      } else {
        setCronResult(`Cron error: ${json.error || res.statusText}`)
      }
    } catch (err: unknown) {
      setCronResult(
        `Cron network error: ${err instanceof Error ? err.message : String(err)}`,
      )
    } finally {
      setCronRunning(false)
    }
  }, [fetchAccounts, filter])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-sky-400" />
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Free-Plugin Accounts
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Devices registered with a{' '}
              <code className="text-xs">nself_free_</code> key
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunCron}
            disabled={cronRunning}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="Run anti-sharing detection"
          >
            {cronRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            Run Anti-Sharing Check
          </button>
          <button
            onClick={() => fetchAccounts(filter)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Cron result banner */}
      {cronResult && (
        <div className="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm text-sky-400">
          {cronResult}
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/50">
        {(['all', 'flagged', 'converted'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* States */}
      {offline && (
        <div className="flex flex-col items-center gap-3 py-16 text-zinc-400">
          <WifiOff className="h-10 w-10" />
          <p className="text-sm">
            Unable to reach the server. Check your network and retry.
          </p>
          <button
            onClick={() => fetchAccounts(filter)}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Retry
          </button>
        </div>
      )}

      {!offline && error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!offline && !error && loading && <Skeleton />}

      {!offline && !error && !loading && accounts.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-zinc-400">
          <Users className="h-10 w-10" />
          <p className="text-sm">
            {filter === 'flagged'
              ? 'No flagged accounts. Run the anti-sharing check to detect sharing violations.'
              : filter === 'converted'
                ? 'No converted accounts yet.'
                : 'No free accounts registered yet.'}
          </p>
        </div>
      )}

      {!offline && !error && !loading && accounts.length > 0 && (
        <>
          {filter === 'flagged' && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Flagged keys have been used from more than 3 distinct IPs in the
              past 7 days. Review before revoking.
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    Key (hash)
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    Installs
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    Plugins
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    Status
                  </th>
                  {filter === 'flagged' && (
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                      IPs (7d)
                    </th>
                  )}
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {accounts.map((account, idx) => {
                  const plugins = parsePluginList(account.plugin_list)
                  return (
                    <tr
                      key={`${account.key_hash_display}-${idx}`}
                      className="bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-300">
                        {account.key_hash_display}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {account.install_count}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {plugins.length === 0 ? (
                            <span className="text-zinc-400">—</span>
                          ) : (
                            plugins.slice(0, 4).map((p) => (
                              <span
                                key={p}
                                className="rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                              >
                                {p}
                              </span>
                            ))
                          )}
                          {plugins.length > 4 && (
                            <span className="text-xs text-zinc-400">
                              +{plugins.length - 4}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <FlagBadge status={account.ip_flag_status ?? 'ok'} />
                      </td>
                      {filter === 'flagged' && (
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {account.ip_count ?? '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                        {formatDate(account.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-right text-xs text-zinc-400">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} shown
          </p>
        </>
      )}
    </div>
  )
}
