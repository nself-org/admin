'use client'

import { CheckCircle2, Clock, Loader2, PlusCircle, RefreshCw, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type RunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'timed_out' | 'error'

interface SyntheticRun {
  id: string
  status: RunStatus
  trigger: string
  started_at: string | null
  finished_at: string | null
  duration_ms: number | null
  error_message: string | null
}

interface SyntheticFlow {
  id: string
  name: string
  description: string | null
  flow_type: 'playwright' | 'api_contract'
  target_url: string
  schedule_cron: string | null
  timeout_seconds: number
  enabled: boolean
  last_run: SyntheticRun | null
}

interface SyntheticFlowsResponse {
  flows: SyntheticFlow[]
  total: number
}

function statusIcon(status: RunStatus | null) {
  if (status === null) return <span className="text-nself-text-muted text-xs">—</span>
  if (status === 'passed') return <CheckCircle2 className="h-4 w-4 text-green-400" />
  if (status === 'failed' || status === 'error' || status === 'timed_out')
    return <XCircle className="h-4 w-4 text-red-400" />
  return <Clock className="h-4 w-4 text-yellow-400" />
}

function statusLabel(status: RunStatus | null): string {
  if (status === null) return 'No runs yet'
  const map: Record<RunStatus, string> = {
    pending: 'Pending',
    running: 'Running',
    passed: 'Passed',
    failed: 'Failed',
    timed_out: 'Timed out',
    error: 'Error',
  }
  return map[status] ?? status
}

export default function SentrySyntheticPage() {
  const [data, setData] = useState<SyntheticFlowsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sentry/synthetic', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Server ${res.status}`)
      const json = (await res.json()) as SyntheticFlowsResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load synthetic flows.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  const passed = data?.flows.filter((f) => f.last_run?.status === 'passed').length ?? 0
  const total = data?.total ?? 0

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">ɳSentry — Synthetic Checks</h1>
          {data !== null && (
            <p className="text-nself-text-muted mt-0.5 text-xs">
              {passed}/{total} checks passing
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
            New Flow
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

      {/* Loading skeleton */}
      {loading && data === null && (
        <div className="glass-card flex items-center justify-center p-12">
          <Loader2 className="text-nself-primary h-6 w-6 animate-spin" />
        </div>
      )}

      {/* Flows list */}
      {data !== null && (
        <div className="glass-card p-4">
          <p className="text-nself-text mb-3 text-sm font-semibold">Flows ({total})</p>
          {total === 0 ? (
            <p className="text-nself-text-muted text-xs">
              No synthetic flows configured. Click &ldquo;New Flow&rdquo; to add a Playwright
              browser script or API contract check.
            </p>
          ) : (
            <div className="space-y-2">
              {data.flows.map((flow) => (
                <div key={flow.id} className="border-nself-border rounded-lg border px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {statusIcon(flow.last_run?.status ?? null)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-nself-text truncate text-sm font-medium">{flow.name}</p>
                        <span className="border-nself-border shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs">
                          {flow.flow_type}
                        </span>
                        {!flow.enabled && (
                          <span className="shrink-0 rounded bg-yellow-500/15 px-1.5 py-0.5 text-xs text-yellow-400">
                            disabled
                          </span>
                        )}
                      </div>
                      <p className="text-nself-text-muted mt-0.5 truncate font-mono text-xs">
                        {flow.target_url}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-nself-text-muted text-xs">
                        {statusLabel(flow.last_run?.status ?? null)}
                      </p>
                      {flow.last_run?.duration_ms !== null &&
                        flow.last_run?.duration_ms !== undefined && (
                          <p className="text-nself-text-muted font-mono text-xs">
                            {flow.last_run.duration_ms} ms
                          </p>
                        )}
                    </div>
                  </div>
                  {flow.last_run?.error_message !== null &&
                    flow.last_run?.error_message !== undefined && (
                      <p className="mt-2 truncate rounded bg-red-500/10 px-2 py-1 font-mono text-xs text-red-300">
                        {flow.last_run.error_message}
                      </p>
                    )}
                  <div className="mt-2 flex items-center gap-3">
                    {flow.schedule_cron !== null ? (
                      <span className="text-nself-text-muted text-xs">
                        schedule: <span className="font-mono">{flow.schedule_cron}</span>
                      </span>
                    ) : (
                      <span className="text-nself-text-muted text-xs">on-demand only</span>
                    )}
                    <span className="text-nself-text-muted text-xs">
                      timeout {flow.timeout_seconds}s
                    </span>
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
