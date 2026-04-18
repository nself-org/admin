'use client'

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface ServiceUptime {
  name: string
  url: string
  status: 'up' | 'down' | 'degraded' | 'unknown'
  latencyMs: number | null
  checkedAt: string
  uptimePct24h: number
  lastIncidentAt: string | null
  httpStatus: number | null
  errorMessage: string | null
}

interface UptimeReport {
  generatedAt: string
  services: ServiceUptime[]
  overallUptimePct: number
}

function StatusIcon({ status }: { status: ServiceUptime['status'] }) {
  switch (status) {
    case 'up':
      return <CheckCircle2 className="h-4 w-4 text-green-400" />
    case 'down':
      return <XCircle className="h-4 w-4 text-red-400" />
    case 'degraded':
      return <AlertTriangle className="h-4 w-4 text-amber-400" />
    default:
      return <Clock className="text-nself-text-muted h-4 w-4" />
  }
}

function pct(n: number): string {
  return `${n.toFixed(2)}%`
}

export default function UptimePage() {
  const [report, setReport] = useState<UptimeReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/uptime', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Server ${res.status}`)
      const data = (await res.json()) as UptimeReport
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load uptime.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">
            Health &amp; Uptime
          </h1>
          <p className="text-nself-text-muted text-xs">
            Continuous health probe of every registered service. Refreshes every
            30 s.
          </p>
        </div>
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

      {error !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {report !== null && (
        <>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="bg-nself-primary/15 flex h-10 w-10 items-center justify-center rounded-lg">
                <Activity className="text-nself-primary h-5 w-5" />
              </div>
              <div>
                <p className="text-nself-text-muted text-xs">
                  24h overall uptime
                </p>
                <p className="nself-gradient-text text-2xl font-semibold">
                  {pct(report.overallUptimePct)}
                </p>
              </div>
              <span className="text-nself-text-muted ml-auto text-xs">
                checked {new Date(report.generatedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          <div className="glass-card p-4">
            <p className="text-nself-text mb-3 text-sm font-semibold">
              Services
            </p>
            {report.services.length === 0 ? (
              <p className="text-nself-text-muted text-xs">
                No services registered yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {report.services.map((svc) => (
                  <li
                    key={svc.name}
                    className="border-nself-border rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <StatusIcon status={svc.status} />
                      <span className="text-nself-text flex-1 truncate text-sm font-medium">
                        {svc.name}
                      </span>
                      <span className="text-nself-text-muted font-mono text-xs">
                        {svc.latencyMs !== null ? `${svc.latencyMs} ms` : '—'}
                      </span>
                      <span
                        className={`ml-2 rounded-full border px-2 py-0.5 text-xs font-medium ${
                          svc.status === 'up'
                            ? 'border-green-500/40 bg-green-500/10 text-green-400'
                            : svc.status === 'down'
                              ? 'border-red-500/40 bg-red-500/10 text-red-400'
                              : svc.status === 'degraded'
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                                : 'border-nself-border text-nself-text-muted bg-nself-bg/40'
                        }`}
                      >
                        {pct(svc.uptimePct24h)} 24h
                      </span>
                    </div>
                    <p className="text-nself-text-muted mt-0.5 font-mono text-xs">
                      {svc.url}
                      {svc.httpStatus !== null && (
                        <span className="ml-2">HTTP {svc.httpStatus}</span>
                      )}
                    </p>
                    {svc.errorMessage !== null && (
                      <p className="mt-1 text-xs text-red-300">
                        {svc.errorMessage}
                      </p>
                    )}
                    {svc.lastIncidentAt !== null && (
                      <p className="text-nself-text-muted mt-1 text-xs">
                        Last incident:{' '}
                        {new Date(svc.lastIncidentAt).toLocaleString()}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
