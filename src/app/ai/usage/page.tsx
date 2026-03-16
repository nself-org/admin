'use client'

import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const AI_API = 'http://127.0.0.1:8010'

// ── Types ──────────────────────────────────────────────────────────────────────

type PluginStatus = 'checking' | 'running' | 'stopped'

interface UsageRow {
  provider: string
  model: string
  tokens_in: number
  tokens_out: number
  cost_usd: number
}

interface UsageData {
  monthly: UsageRow[]
  budget_usd: number | null
  budget_used_usd: number
  last_reset: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtCost(n: number): string {
  return `$${n.toFixed(4)}`
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PluginStatus }) {
  if (status === 'checking') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-zinc-600/50 bg-zinc-800/50 px-3 py-1 text-xs font-medium text-zinc-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking
      </span>
    )
  }
  if (status === 'running') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-900/20 px-3 py-1 text-xs font-medium text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        Running
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-900/20 px-3 py-1 text-xs font-medium text-red-400">
      <XCircle className="h-3 w-3" />
      Offline
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AIUsagePage() {
  const [pluginStatus, setPluginStatus] = useState<PluginStatus>('checking')
  const [refreshingStatus, setRefreshingStatus] = useState(false)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  // ── Health check ────────────────────────────────────────────────────────────

  const checkHealth = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshingStatus(true)
    else setPluginStatus('checking')
    try {
      const res = await fetch(`${AI_API}/health`, {
        signal: AbortSignal.timeout(4000),
      })
      setPluginStatus(res.ok ? 'running' : 'stopped')
    } catch {
      setPluginStatus('stopped')
    } finally {
      setRefreshingStatus(false)
    }
  }

  // ── Fetch usage ─────────────────────────────────────────────────────────────

  const fetchUsage = async () => {
    try {
      const res = await fetch(`${AI_API}/admin/usage`, { cache: 'no-store' })
      if (!res.ok) {
        setUsageData(null)
        return
      }
      const data = (await res.json()) as UsageData
      setUsageData(data)
    } catch {
      setUsageData(null)
    } finally {
      setLoading(false)
    }
  }

  // ── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      await checkHealth()
      await fetchUsage()
    }
    void init()
  }, [])

  // ── Auto-refresh ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      void fetchUsage()
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  // ── Manual refresh ──────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshingStatus(true)
    setLoading(true)
    await checkHealth()
    await fetchUsage()
    setRefreshingStatus(false)
  }

  // ── Reset month counter ─────────────────────────────────────────────────────

  const handleReset = async () => {
    setConfirmReset(false)
    setResetting(true)
    setResetResult(null)
    try {
      const res = await fetch(`${AI_API}/admin/usage/reset`, { method: 'DELETE' })
      if (res.ok) {
        setResetResult({ ok: true, msg: 'Monthly counter reset.' })
        await fetchUsage()
      } else {
        setResetResult({ ok: false, msg: `Reset failed (HTTP ${res.status})` })
      }
    } catch {
      setResetResult({ ok: false, msg: 'Could not reach nself-ai.' })
    } finally {
      setResetting(false)
    }
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (!usageData?.monthly.length) return
    const rows = usageData.monthly
    const header = 'Provider,Model,Tokens In,Tokens Out,Est. Cost (USD)\n'
    const body = rows
      .map(
        (r) =>
          `${r.provider},${r.model},${r.tokens_in},${r.tokens_out},${r.cost_usd.toFixed(6)}`,
      )
      .join('\n')
    const csv = header + body
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const now = new Date()
    a.href = url
    a.download = `ai-usage-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Sorted rows ─────────────────────────────────────────────────────────────

  const sortedRows = usageData?.monthly
    ? [...usageData.monthly].sort((a, b) => b.cost_usd - a.cost_usd)
    : []

  const totalTokensIn = sortedRows.reduce((acc, r) => acc + r.tokens_in, 0)
  const totalTokensOut = sortedRows.reduce((acc, r) => acc + r.tokens_out, 0)
  const totalCost = sortedRows.reduce((acc, r) => acc + r.cost_usd, 0)

  const budgetPct =
    usageData?.budget_usd && usageData.budget_usd > 0
      ? Math.min(100, (usageData.budget_used_usd / usageData.budget_usd) * 100)
      : null

  // ── Confirm reset dialog ────────────────────────────────────────────────────

  if (confirmReset) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
          <h2 className="text-base font-semibold text-white">Reset monthly counter?</h2>
          <p className="mt-2 text-sm text-zinc-400">
            This will clear the current month&apos;s token usage totals. Historical data is not
            deleted — only the running counter is reset.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded-lg border border-zinc-600 bg-zinc-700/50 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleReset()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">AI Usage</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Monthly token usage and cost breakdown for nself-ai
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={pluginStatus} />
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshingStatus}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            {refreshingStatus ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Plugin offline warning */}
      {pluginStatus === 'stopped' && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">nself-ai is not running</p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Usage data is unavailable while nself-ai is offline.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {usageData && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Tokens In
              </span>
            </div>
            <p className="text-2xl font-semibold text-white">{fmtTokens(totalTokensIn)}</p>
          </div>
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Tokens Out
              </span>
            </div>
            <p className="text-2xl font-semibold text-white">{fmtTokens(totalTokensOut)}</p>
          </div>
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Est. Cost
              </span>
            </div>
            <p className="text-2xl font-semibold text-white">{fmtCost(totalCost)}</p>
          </div>
        </div>
      )}

      {/* Budget gauge */}
      {usageData && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Monthly Budget</h2>
            <div className="flex items-center gap-3">
              {usageData.last_reset && (
                <span className="text-xs text-zinc-600">
                  Last reset: {new Date(usageData.last_reset).toLocaleDateString()}
                </span>
              )}
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                disabled={resetting}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
              >
                {resetting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}
                Reset Month Counter
              </button>
            </div>
          </div>

          {usageData.budget_usd ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  {fmtCost(usageData.budget_used_usd)} used
                </span>
                <span className="text-zinc-500">
                  {fmtCost(usageData.budget_usd)} limit
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-700">
                <div
                  className={`h-3 rounded-full transition-all ${
                    (budgetPct ?? 0) >= 90
                      ? 'bg-red-500'
                      : (budgetPct ?? 0) >= 70
                        ? 'bg-yellow-500'
                        : 'bg-indigo-500'
                  }`}
                  style={{ width: `${budgetPct ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-zinc-600">
                {(budgetPct ?? 0).toFixed(1)}% of monthly budget used
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              Unlimited{' '}
              <span className="text-xs text-zinc-600">
                (no PLUGIN_AI_MONTHLY_BUDGET_USD set)
              </span>
            </p>
          )}

          {resetResult && (
            <div
              className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${
                resetResult.ok
                  ? 'border-green-500/30 bg-green-900/20'
                  : 'border-red-500/30 bg-red-900/20'
              }`}
            >
              {resetResult.ok ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400" />
              )}
              <p className={`text-xs ${resetResult.ok ? 'text-green-300' : 'text-red-300'}`}>
                {resetResult.msg}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Usage table */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50">
        <div className="flex items-center justify-between border-b border-zinc-700/50 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Usage Breakdown</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-indigo-500"
              />
              Auto-refresh
            </label>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!sortedRows.length}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 animate-pulse rounded-lg bg-zinc-700/40" />
            ))}
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="mb-2 h-7 w-7 text-zinc-700" />
            <p className="text-sm text-zinc-500">No usage data this month</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700/50">
                  {['Provider', 'Model', 'Tokens In', 'Tokens Out', 'Est. Cost'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {sortedRows.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-700/20 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-zinc-200 capitalize">
                      {row.provider}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-zinc-400">
                      {row.model}
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-300">
                      {fmtTokens(row.tokens_in)}
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-300">
                      {fmtTokens(row.tokens_out)}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-indigo-300">
                      {fmtCost(row.cost_usd)}
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="border-t border-zinc-600/50 bg-zinc-700/20">
                  <td className="px-5 py-3 text-xs font-medium uppercase text-zinc-500" colSpan={2}>
                    Total
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-white">
                    {fmtTokens(totalTokensIn)}
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-white">
                    {fmtTokens(totalTokensOut)}
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-indigo-300">
                    {fmtCost(totalCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
