'use client'

import type { SentryStatus } from '@/components/sentry/StatusBadge'
import { StatusBadge } from '@/components/sentry/StatusBadge'
import { UptimeSparkline } from '@/components/sentry/UptimeSparkline'
import { Activity, CheckCircle2, Loader2, PlusCircle, RefreshCw, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface UptimeCheck {
  timestamp: string
  up: boolean
}

interface UptimeMonitor {
  id: string
  name: string
  url: string
  status: SentryStatus
  latencyMs: number | null
  checks: UptimeCheck[]
  uptime24h: number
  uptime7d: number
  uptime30d: number
  lastCheckedAt: string | null
}

interface UptimeResponse {
  monitors: UptimeMonitor[]
  generatedAt: string
}

function pct(n: number): string {
  return `${n.toFixed(2)}%`
}

export default function SentryUptimePage() {
  const [data, setData] = useState<UptimeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sentry/uptime', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Server ${res.status}`)
      const json = (await res.json()) as UptimeResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load uptime monitors.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  const operational = data?.monitors.filter((m) => m.status === 'operational').length ?? 0
  const total = data?.monitors.length ?? 0

  if (loading && data === null) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <div className="bg-nself-surface h-8 w-64 animate-pulse rounded-lg" />
        <div className="bg-nself-surface h-24 animate-pulse rounded-lg" />
        <div className="bg-nself-surface h-48 animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">ɳSentry — Uptime Monitors</h1>
          {data !== null && (
            <p className="text-nself-text-muted mt-0.5 text-xs">
              {operational}/{total} monitors operational · refreshed{' '}
              {new Date(data.generatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
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
          <button className="text-nself-primary flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs transition hover:bg-blue-500/20">
            <PlusCircle className="h-3.5 w-3.5" />
            Add Monitor
          </button>
        </div>
      </div>

      {/* Error */}
      {error !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Summary card */}
      {data !== null && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-nself-primary/15 flex h-10 w-10 items-center justify-center rounded-lg">
              <Activity className="text-nself-primary h-5 w-5" />
            </div>
            <div>
              <p className="text-nself-text-muted text-xs">Overall status</p>
              <p className="nself-gradient-text text-2xl font-semibold">
                {total === 0
                  ? '—'
                  : operational === total
                    ? 'All Operational'
                    : `${operational} / ${total} Operational`}
              </p>
            </div>
            {operational === total && total > 0 && (
              <CheckCircle2 className="ml-auto h-5 w-5 text-green-400" />
            )}
          </div>
        </div>
      )}

      {/* Monitors table */}
      {data !== null && (
        <div className="glass-card p-4">
          <p className="text-nself-text mb-3 text-sm font-semibold">Monitors ({total})</p>
          {total === 0 ? (
            <p className="text-nself-text-muted text-xs">
              No monitors configured. Click &ldquo;Add Monitor&rdquo; to start tracking uptime.
            </p>
          ) : (
            <div className="space-y-3">
              {data.monitors.map((monitor) => (
                <div key={monitor.id} className="border-nself-border rounded-lg border px-4 py-3">
                  {/* Row 1: name + status + latency */}
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-nself-text truncate text-sm font-medium">{monitor.name}</p>
                      <p className="text-nself-text-muted truncate font-mono text-xs">
                        {monitor.url}
                      </p>
                    </div>
                    <span className="text-nself-text-muted shrink-0 font-mono text-xs">
                      {monitor.latencyMs !== null ? `${monitor.latencyMs} ms` : '—'}
                    </span>
                    <StatusBadge status={monitor.status} />
                  </div>

                  {/* Row 2: sparkline */}
                  <div className="mt-3">
                    <UptimeSparkline dataPoints={monitor.checks} width={480} height={20} />
                  </div>

                  {/* Row 3: uptime % */}
                  <div className="mt-2 flex items-center gap-4">
                    <span className="text-nself-text-muted text-xs">
                      24h:{' '}
                      <span className="text-nself-text font-medium">{pct(monitor.uptime24h)}</span>
                    </span>
                    <span className="text-nself-text-muted text-xs">
                      7d:{' '}
                      <span className="text-nself-text font-medium">{pct(monitor.uptime7d)}</span>
                    </span>
                    <span className="text-nself-text-muted text-xs">
                      30d:{' '}
                      <span className="text-nself-text font-medium">{pct(monitor.uptime30d)}</span>
                    </span>
                    {monitor.lastCheckedAt !== null && (
                      <span className="text-nself-text-muted ml-auto text-xs">
                        checked {new Date(monitor.lastCheckedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
