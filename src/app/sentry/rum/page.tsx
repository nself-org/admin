'use client'

import type { RumEvent } from '@/components/sentry/SessionReplay'
import { SessionReplay } from '@/components/sentry/SessionReplay'
import { AlertTriangle, Loader2, Monitor, RefreshCw, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface TopError {
  message: string
  count: number
  lastSeenAt: string
}

interface RumMetrics {
  eventCount24h: number
  activeSessionCount: number
  p50LoadMs: number
  p95LoadMs: number
  topErrors: TopError[]
  recentSession: {
    id: string
    events: RumEvent[]
  } | null
  generatedAt: string
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-nself-border rounded-lg border px-4 py-3">
      <p className="text-nself-text-muted text-xs">{label}</p>
      <p className="nself-gradient-text mt-0.5 text-2xl font-semibold">{value}</p>
      {sub !== undefined && <p className="text-nself-text-muted text-xs">{sub}</p>}
    </div>
  )
}

export default function SentryRumPage() {
  const [data, setData] = useState<RumMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sentry/rum', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Server ${res.status}`)
      const json = (await res.json()) as RumMetrics
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RUM metrics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  if (loading && data === null) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div className="bg-nself-surface h-8 w-64 animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-nself-surface h-20 animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="bg-nself-surface h-40 animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">
            ɳSentry — Real User Monitoring
          </h1>
          {data !== null && (
            <p className="text-nself-text-muted mt-0.5 text-xs">
              Refreshed {new Date(data.generatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="border-nself-border text-nself-text-muted hover:text-nself-text flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {/* Error */}
      {error !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {data !== null && (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Events (24h)" value={data.eventCount24h.toLocaleString()} />
            <MetricCard label="Active sessions" value={data.activeSessionCount.toLocaleString()} />
            <MetricCard label="Page load P50" value={`${data.p50LoadMs} ms`} />
            <MetricCard
              label="Page load P95"
              value={`${data.p95LoadMs} ms`}
              sub="target < 2000 ms"
            />
          </div>

          {/* Top errors */}
          <div className="glass-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <p className="text-nself-text text-sm font-semibold">Top Errors</p>
            </div>
            {data.topErrors.length === 0 ? (
              <p className="text-nself-text-muted text-xs">No errors recorded in the last 24h.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.topErrors.map((err, idx) => (
                  <li
                    key={idx}
                    className="border-nself-border flex items-start gap-3 rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-nself-text truncate font-mono text-xs">{err.message}</p>
                      <p className="text-nself-text-muted text-xs">
                        last seen {new Date(err.lastSeenAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                      {err.count.toLocaleString()}×
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Session replay */}
          {data.recentSession !== null && (
            <div className="glass-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-400" />
                <p className="text-nself-text text-sm font-semibold">Recent Session</p>
              </div>
              <SessionReplay sessionId={data.recentSession.id} events={data.recentSession.events} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
