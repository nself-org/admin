'use client'

/**
 * Heavy Users Panel — S56-T06
 *
 * Displays users in the 95th+ percentile of monthly token usage.
 * Operator-facing visibility into the abuse vector. No automatic action.
 * CSV export included. Auth gate: Owner license required.
 *
 * 7 UI states: loading · empty · error · populated · offline · permission-denied · rate-limited
 */

import { AlertTriangle, Download, RefreshCw, Shield, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface HeavyUser {
  userId: string
  tenantId: string
  billingMonth: string
  totalTokens: number
  p95Threshold: number
  multipleOfP95: number
  warnSentAt: string | null
  capped: boolean
}

interface HeavyUsersResponse {
  users: HeavyUser[]
  p95Threshold: number
  billingMonth: string
  fetchedAt: string
  stale?: boolean
}

type UIState =
  | { tag: 'loading' }
  | { tag: 'empty'; billingMonth: string }
  | { tag: 'error'; message: string }
  | { tag: 'populated'; data: HeavyUsersResponse }
  | { tag: 'offline'; data: HeavyUsersResponse }
  | { tag: 'permission-denied' }
  | { tag: 'rate-limited'; retryAfter: number }

export function HeavyUsersPanel() {
  const [state, setState] = useState<UIState>({ tag: 'loading' })
  const [percentile, setPercentile] = useState(95)

  const fetchHeavyUsers = useCallback(async () => {
    setState({ tag: 'loading' })
    try {
      const res = await fetch(`/api/users/heavy?percentile=${percentile}`, {
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (res.status === 403) {
        setState({ tag: 'permission-denied' })
        return
      }
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') ?? '30', 10)
        setState({ tag: 'rate-limited', retryAfter })
        return
      }
      if (!res.ok) {
        const text = await res.text()
        setState({ tag: 'error', message: text || `HTTP ${res.status}` })
        return
      }
      const data = (await res.json()) as HeavyUsersResponse
      if (data.stale) {
        setState({ tag: 'offline', data })
      } else if (data.users.length === 0) {
        setState({ tag: 'empty', billingMonth: data.billingMonth })
      } else {
        setState({ tag: 'populated', data })
      }
    } catch {
      setState({ tag: 'error', message: 'Network error — check your connection.' })
    }
  }, [percentile])

  useEffect(() => {
    void fetchHeavyUsers()
  }, [fetchHeavyUsers])

  function exportCSV(users: HeavyUser[]) {
    const header = 'user_id,tenant_id,billing_month,total_tokens,p95_threshold,multiple_of_p95,warn_sent,capped'
    const rows = users.map(u =>
      [u.userId, u.tenantId, u.billingMonth, u.totalTokens, u.p95Threshold,
        u.multipleOfP95.toFixed(1), u.warnSentAt ?? '', u.capped ? 'yes' : 'no'].join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `heavy-users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (state.tag === 'permission-denied') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Shield className="h-12 w-12 text-red-400 mb-3" />
        <p className="text-sm text-zinc-400">Owner license required to view heavy users.</p>
      </div>
    )
  }

  if (state.tag === 'rate-limited') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-400 mb-3" />
        <p className="text-sm text-zinc-400">Rate limited. Retry in {state.retryAfter}s.</p>
      </div>
    )
  }

  if (state.tag === 'loading') {
    return (
      <div className="animate-pulse space-y-3 py-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 bg-zinc-800 rounded-md" />
        ))}
      </div>
    )
  }

  if (state.tag === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-red-400 mb-3" />
        <p className="text-sm text-zinc-300 mb-4">{state.message}</p>
        <button
          onClick={() => void fetchHeavyUsers()}
          className="flex items-center gap-2 rounded-md bg-zinc-700 px-4 py-2 text-sm hover:bg-zinc-600"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    )
  }

  if (state.tag === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-12 w-12 text-zinc-600 mb-3" />
        <p className="text-sm text-zinc-400">No heavy users this billing month ({state.billingMonth}).</p>
        <p className="text-xs text-zinc-500 mt-1">Users above the {percentile}th percentile will appear here.</p>
      </div>
    )
  }

  const data = state.tag === 'offline' ? state.data : state.tag === 'populated' ? state.data : null
  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Heavy Users</h2>
          <p className="text-xs text-zinc-400">
            Users above the {percentile}th percentile — {data.billingMonth}
            {state.tag === 'offline' && (
              <span className="ml-2 text-yellow-400">(stale — last updated {data.fetchedAt})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={percentile}
            onChange={e => setPercentile(Number(e.target.value))}
            className="rounded-md bg-zinc-800 border border-zinc-700 text-sm px-2 py-1 text-white"
          >
            <option value={90}>p90</option>
            <option value={95}>p95</option>
            <option value={99}>p99</option>
          </select>
          <button
            onClick={() => exportCSV(data.users)}
            className="flex items-center gap-1 rounded-md bg-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-600"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          <button
            onClick={() => void fetchHeavyUsers()}
            className="flex items-center gap-1 rounded-md bg-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-600"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Tokens</th>
              <th className="px-4 py-3">× p{percentile}</th>
              <th className="px-4 py-3">Warned</th>
              <th className="px-4 py-3">Capped</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data.users.map(u => (
              <tr key={`${u.userId}-${u.tenantId}`} className="hover:bg-zinc-800/50">
                <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                  {u.userId.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 text-white font-medium">
                  {u.totalTokens.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${u.multipleOfP95 >= 5 ? 'text-red-400' : u.multipleOfP95 >= 2 ? 'text-yellow-400' : 'text-zinc-300'}`}>
                    {u.multipleOfP95.toFixed(1)}×
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400 text-xs">
                  {u.warnSentAt ? new Date(u.warnSentAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  {u.capped
                    ? <span className="text-red-400 font-semibold">Yes</span>
                    : <span className="text-zinc-500">No</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500">
        Threshold (p{percentile}): {data.p95Threshold.toLocaleString()} tokens/mo.
        This list is for operator visibility only — no automatic action is taken.
      </p>
    </div>
  )
}
