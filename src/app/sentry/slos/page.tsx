'use client'

import { BurnMeter } from '@/components/sentry/BurnMeter'
import { CheckCircle2, Loader2, PlusCircle, RefreshCw, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface SloBreachEvent {
  date: string
  durationMinutes: number
  burnRate: number
}

interface Slo {
  id: string
  name: string
  description: string
  targetPct: number
  currentPct: number
  errorBudgetMinutes: number
  burnRate1h: number
  burnRate6h: number
  burnRate24h: number
  errorBudgetRemainingPct: number
  breaches7d: SloBreachEvent[]
  window: '1h' | '6h' | '24h' | '72h'
}

interface SlosResponse {
  slos: Slo[]
  generatedAt: string
}

export default function SentrySlosPage() {
  const [data, setData] = useState<SlosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sentry/slos', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Server ${res.status}`)
      const json = (await res.json()) as SlosResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SLOs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  if (loading && data === null) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div className="bg-nself-surface h-8 w-48 animate-pulse rounded-lg" />
        <div className="bg-nself-surface h-32 animate-pulse rounded-lg" />
        <div className="bg-nself-surface h-32 animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">ɳSentry — SLOs</h1>
          {data !== null && (
            <p className="text-nself-text-muted mt-0.5 text-xs">
              {data.slos.length} service level objective
              {data.slos.length !== 1 ? 's' : ''} · refreshed{' '}
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
            Add SLO
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

      {/* SLOs list */}
      {data !== null && (
        <div className="glass-card p-4">
          <p className="text-nself-text mb-3 text-sm font-semibold">SLOs ({data.slos.length})</p>
          {data.slos.length === 0 ? (
            <p className="text-nself-text-muted text-xs">
              No SLOs configured. Add an SLO to track error budgets.
            </p>
          ) : (
            <div className="space-y-4">
              {data.slos.map((slo) => (
                <div key={slo.id} className="border-nself-border rounded-lg border px-4 py-4">
                  {/* Name + current vs target */}
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-nself-text text-sm font-medium">{slo.name}</p>
                      {slo.description.length > 0 && (
                        <p className="text-nself-text-muted text-xs">{slo.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex items-center gap-1.5">
                        {slo.currentPct >= slo.targetPct ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span
                          className={
                            slo.currentPct >= slo.targetPct
                              ? 'text-sm font-semibold text-green-400'
                              : 'text-sm font-semibold text-red-400'
                          }
                        >
                          {slo.currentPct.toFixed(3)}%
                        </span>
                      </div>
                      <p className="text-nself-text-muted text-xs">
                        target {slo.targetPct.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Burn meter */}
                  <BurnMeter
                    burnRate={slo.burnRate24h}
                    window={slo.window}
                    budget={slo.errorBudgetMinutes}
                    className="mb-3"
                  />

                  {/* Burn rate table */}
                  <div className="flex gap-4">
                    <span className="text-nself-text-muted text-xs">
                      1h burn: <span className="text-nself-text">{slo.burnRate1h.toFixed(2)}×</span>
                    </span>
                    <span className="text-nself-text-muted text-xs">
                      6h burn: <span className="text-nself-text">{slo.burnRate6h.toFixed(2)}×</span>
                    </span>
                    <span className="text-nself-text-muted text-xs">
                      24h burn:{' '}
                      <span className="text-nself-text">{slo.burnRate24h.toFixed(2)}×</span>
                    </span>
                  </div>

                  {/* Breach history */}
                  {slo.breaches7d.length > 0 && (
                    <div className="border-nself-border mt-3 border-t pt-3">
                      <p className="text-nself-text-muted mb-1.5 text-xs font-medium">
                        Breaches (last 7 days)
                      </p>
                      <ul className="space-y-1">
                        {slo.breaches7d.map((breach, i) => (
                          <li key={i} className="flex items-center gap-3 text-xs">
                            <span className="text-nself-text-muted font-mono">
                              {new Date(breach.date).toLocaleDateString()}
                            </span>
                            <span className="text-nself-text">{breach.durationMinutes} min</span>
                            <span className="text-red-400">{breach.burnRate.toFixed(1)}× burn</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
