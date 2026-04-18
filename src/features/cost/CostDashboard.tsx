'use client'

import {
  AlertCircle,
  DollarSign,
  Folder,
  Loader2,
  RefreshCw,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { CostProvider, CostSnapshot, ProviderComparison } from './types'

function fmtUsd(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'pos' | 'neg' | 'neutral'
}) {
  const className =
    tone === 'pos'
      ? 'border-green-500/40 text-green-400 bg-green-500/10'
      : tone === 'neg'
        ? 'border-red-500/40 text-red-400 bg-red-500/10'
        : 'border-nself-border text-nself-text-muted bg-nself-bg/40'
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  )
}

export function CostDashboard() {
  const [snapshot, setSnapshot] = useState<CostSnapshot | null>(null)
  const [comparison, setComparison] = useState<ProviderComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentProvider, setCurrentProvider] =
    useState<CostProvider>('hetzner')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sRes, cRes] = await Promise.all([
        fetch('/api/cost/snapshot', { cache: 'no-store' }),
        fetch(`/api/cost/comparison?provider=${currentProvider}`, {
          cache: 'no-store',
        }),
      ])
      if (!sRes.ok) throw new Error(`snapshot: ${sRes.status}`)
      if (!cRes.ok) throw new Error(`comparison: ${cRes.status}`)
      const s = (await sRes.json()) as CostSnapshot
      const c = (await cRes.json()) as ProviderComparison
      setSnapshot(s)
      setComparison(c)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cost data.')
    } finally {
      setLoading(false)
    }
  }, [currentProvider])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">
            Cost Dashboard
          </h1>
          <p className="text-nself-text-muted text-xs">
            Per-project and per-user monthly spend
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={currentProvider}
            onChange={(e) => setCurrentProvider(e.target.value as CostProvider)}
            className="border-nself-border bg-nself-bg text-nself-text focus:border-nself-primary rounded-lg border px-2 py-1 text-xs focus:outline-none"
          >
            <option value="hetzner">Hetzner</option>
            <option value="aws">AWS</option>
            <option value="gcp">GCP</option>
            <option value="do">DigitalOcean</option>
            <option value="vercel">Vercel</option>
          </select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {error !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {snapshot !== null && (
        <>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="bg-nself-primary/15 flex h-10 w-10 items-center justify-center rounded-lg">
                <DollarSign className="text-nself-primary h-5 w-5" />
              </div>
              <div>
                <p className="text-nself-text-muted text-xs">Monthly spend</p>
                <p className="nself-gradient-text text-2xl font-semibold">
                  {fmtUsd(snapshot.totalMonthlyUsd)}
                </p>
              </div>
              <span className="text-nself-text-muted ml-auto text-xs">
                snapshot {new Date(snapshot.generatedAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="glass-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Folder className="text-nself-primary h-4 w-4" />
                <p className="text-nself-text text-sm font-semibold">
                  By Project
                </p>
              </div>
              {Object.keys(snapshot.byProject).length === 0 ? (
                <p className="text-nself-text-muted text-xs">
                  No cost data yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {Object.entries(snapshot.byProject).map(([proj, usd]) => (
                    <li key={proj} className="flex justify-between text-sm">
                      <span className="text-nself-text">{proj}</span>
                      <span className="text-nself-text-muted font-mono">
                        {fmtUsd(usd)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Users className="text-nself-primary h-4 w-4" />
                <p className="text-nself-text text-sm font-semibold">By User</p>
              </div>
              {Object.keys(snapshot.byUser).length === 0 ? (
                <p className="text-nself-text-muted text-xs">
                  No cost data yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {Object.entries(snapshot.byUser).map(([user, usd]) => (
                    <li key={user} className="flex justify-between text-sm">
                      <span className="text-nself-text">{user}</span>
                      <span className="text-nself-text-muted font-mono">
                        {fmtUsd(usd)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {comparison !== null && (
            <div className="glass-card p-4">
              <p className="text-nself-text mb-3 text-sm font-semibold">
                Provider comparison
              </p>
              <p className="text-nself-text-muted mb-3 text-xs">
                Estimated monthly cost on other providers for the same workload
                shape.
              </p>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-nself-text-muted text-xs">
                    <th className="pr-4 pb-2 font-medium">Provider</th>
                    <th className="pr-4 pb-2 font-medium">Monthly</th>
                    <th className="pr-4 pb-2 font-medium">Delta</th>
                    <th className="pb-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-nself-border border-t">
                    <td className="text-nself-text py-2 pr-4 font-semibold">
                      {comparison.current.toUpperCase()}{' '}
                      <span className="text-nself-primary ml-2 text-xs">
                        (current)
                      </span>
                    </td>
                    <td className="text-nself-text py-2 pr-4 font-mono">
                      {fmtUsd(comparison.currentMonthlyUsd)}
                    </td>
                    <td className="py-2 pr-4">
                      <Pill tone="neutral">—</Pill>
                    </td>
                    <td className="text-nself-text-muted py-2 text-xs">
                      Your active provider
                    </td>
                  </tr>
                  {comparison.alternatives.map((alt) => {
                    const tone =
                      alt.deltaVsCurrentUsd > 0
                        ? 'neg'
                        : alt.deltaVsCurrentUsd < 0
                          ? 'pos'
                          : 'neutral'
                    return (
                      <tr
                        key={alt.provider}
                        className="border-nself-border border-t"
                      >
                        <td className="text-nself-text py-2 pr-4">
                          {alt.label}
                        </td>
                        <td className="text-nself-text py-2 pr-4 font-mono">
                          {fmtUsd(alt.monthlyUsd)}
                        </td>
                        <td className="py-2 pr-4">
                          <Pill tone={tone}>
                            {alt.deltaVsCurrentUsd > 0 ? '+' : ''}
                            {fmtUsd(alt.deltaVsCurrentUsd)}
                          </Pill>
                        </td>
                        <td className="text-nself-text-muted py-2 text-xs">
                          {alt.notes}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {loading && snapshot === null && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-nself-primary h-5 w-5 animate-spin" />
        </div>
      )}
    </div>
  )
}
