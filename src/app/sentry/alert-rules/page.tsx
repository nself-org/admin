'use client'

import { Bell, Loader2, PlusCircle, RefreshCw, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface AlertRoute {
  id: string
  name: string
  destination_type: string
  destination_config: Record<string, unknown>
  matchers: Array<{ key: string; op: string; value: string }>
  priority: number
  enabled: boolean
  created_at: string
}

interface AlertRoutesResponse {
  routes: AlertRoute[]
  total: number
}

function destLabel(route: AlertRoute): string {
  const cfg = route.destination_config ?? {}
  switch (route.destination_type) {
    case 'slack':
    case 'teams': {
      const url = (cfg.webhook_url ?? cfg.url ?? '') as string
      return url ? `→ ${url.slice(0, 40)}…` : route.destination_type
    }
    case 'email': {
      const to = cfg.to as string | undefined
      return to ? `→ ${to}` : 'email'
    }
    case 'telegram': {
      const chatId = cfg.chat_id as string | undefined
      return chatId ? `chat ${chatId}` : 'telegram'
    }
    case 'pagerduty':
      return 'PagerDuty'
    default:
      return route.destination_type
  }
}

export default function SentryAlertRulesPage() {
  const [data, setData] = useState<AlertRoutesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sentry/alert-routes', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Server ${res.status}`)
      const json = (await res.json()) as AlertRoutesResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alert routes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">ɳSentry — Alert Routes</h1>
          {data !== null && (
            <p className="text-nself-text-muted mt-0.5 text-xs">
              {data.total} route{data.total !== 1 ? 's' : ''} configured
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
            Add Route
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

      {/* Routes list */}
      {data !== null && (
        <div className="glass-card p-4">
          <p className="text-nself-text mb-3 text-sm font-semibold">Routes ({data.total})</p>
          {data.total === 0 ? (
            <p className="text-nself-text-muted text-xs">
              No alert routes configured. Click &ldquo;Add Route&rdquo; to route alerts to Slack,
              email, PagerDuty, or other destinations.
            </p>
          ) : (
            <div className="space-y-2">
              {data.routes.map((route) => (
                <div
                  key={route.id}
                  className="border-nself-border flex items-start gap-3 rounded-lg border px-4 py-3"
                >
                  <div className="bg-nself-primary/10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                    <Bell className="text-nself-primary h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-nself-text truncate text-sm font-medium">{route.name}</p>
                      {!route.enabled && (
                        <span className="shrink-0 rounded bg-yellow-500/15 px-1.5 py-0.5 text-xs text-yellow-400">
                          disabled
                        </span>
                      )}
                    </div>
                    <p className="text-nself-text-muted mt-0.5 font-mono text-xs">
                      {route.destination_type} {destLabel(route)}
                    </p>
                    {route.matchers.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {route.matchers.map((m, i) => (
                          <span
                            key={i}
                            className="border-nself-border rounded border px-1.5 py-0.5 font-mono text-xs"
                          >
                            {m.key}
                            {m.op}
                            {m.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-nself-text-muted shrink-0 text-xs">
                    priority {route.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
