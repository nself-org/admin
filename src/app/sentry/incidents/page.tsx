'use client'

import { StatusBadge } from '@/components/sentry/StatusBadge'
import type { SentryStatus } from '@/components/sentry/StatusBadge'
import clsx from 'clsx'
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface TimelineEvent {
  at: string
  type: 'opened' | 'update' | 'resolved'
  message: string
  author?: string
}

interface Incident {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'investigating' | 'resolved'
  sentryStatus: SentryStatus
  createdAt: string
  resolvedAt: string | null
  assignees: string[]
  affectedComponents: string[]
  timeline: TimelineEvent[]
}

interface IncidentsResponse {
  incidents: Incident[]
  generatedAt: string
}

const SEVERITY_CLASS: Record<Incident['severity'], string> = {
  critical: 'border-red-500/40 bg-red-500/10 text-red-400',
  high: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  low: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
]

export default function SentryIncidentsPage() {
  const [data, setData] = useState<IncidentsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sentry/incidents', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Server ${res.status}`)
      const json = (await res.json()) as IncidentsResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const incidents = data?.incidents ?? []
  const filtered =
    filter === 'all' ? incidents : incidents.filter((i) => i.status === filter)

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">
            ɳSentry — Incidents
          </h1>
          {data !== null && (
            <p className="text-nself-text-muted mt-0.5 text-xs">
              {filtered.length} incident
              {filtered.length !== 1 ? 's' : ''} · refreshed{' '}
              {new Date(data.generatedAt).toLocaleTimeString()}
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

      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              filter === opt.value
                ? 'bg-nself-primary/15 text-nself-primary'
                : 'text-nself-text-muted hover:text-nself-text',
            )}
          >
            {opt.label}
            {opt.value !== 'all' && data !== null && (
              <span className="text-nself-text-muted ml-1.5">
                (
                {
                  incidents.filter((i) =>
                    opt.value === 'all' ? true : i.status === opt.value,
                  ).length
                }
                )
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Incidents list */}
      {data !== null && (
        <div className="glass-card p-4">
          {filtered.length === 0 ? (
            <p className="text-nself-text-muted text-xs">
              {filter === 'all'
                ? 'No incidents recorded.'
                : `No ${filter} incidents.`}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((incident) => {
                const isExpanded = expanded.has(incident.id)
                return (
                  <li
                    key={incident.id}
                    className="border-nself-border rounded-lg border"
                  >
                    {/* Summary row */}
                    <button
                      className="flex w-full items-start gap-3 px-4 py-3 text-left"
                      onClick={() => toggleExpand(incident.id)}
                    >
                      <span className="mt-0.5 shrink-0 text-nself-text-muted">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-nself-text text-sm font-medium">
                          {incident.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={clsx(
                              'rounded-full border px-2 py-0.5 text-xs font-medium',
                              SEVERITY_CLASS[incident.severity],
                            )}
                          >
                            {incident.severity}
                          </span>
                          <StatusBadge status={incident.sentryStatus} />
                          {incident.affectedComponents.length > 0 && (
                            <span className="text-nself-text-muted text-xs">
                              {incident.affectedComponents.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-nself-text-muted text-xs">
                          {new Date(incident.createdAt).toLocaleDateString()}
                        </p>
                        {incident.resolvedAt !== null && (
                          <p className="text-green-400 text-xs">
                            resolved{' '}
                            {new Date(
                              incident.resolvedAt,
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Timeline (expanded) */}
                    {isExpanded && (
                      <div className="border-nself-border border-t px-4 pb-4 pt-3">
                        <p className="text-nself-text-muted mb-2 text-xs font-medium">
                          Timeline
                        </p>
                        {incident.timeline.length === 0 ? (
                          <p className="text-nself-text-muted text-xs">
                            No timeline events.
                          </p>
                        ) : (
                          <ol className="space-y-2">
                            {incident.timeline.map((event, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <span
                                  className={clsx(
                                    'mt-1 h-2 w-2 shrink-0 rounded-full',
                                    event.type === 'resolved'
                                      ? 'bg-green-400'
                                      : event.type === 'opened'
                                        ? 'bg-red-400'
                                        : 'bg-amber-400',
                                  )}
                                />
                                <div className="flex-1">
                                  <p className="text-nself-text text-xs">
                                    {event.message}
                                  </p>
                                  {event.author !== undefined && (
                                    <p className="text-nself-text-muted text-xs">
                                      by {event.author}
                                    </p>
                                  )}
                                </div>
                                <span className="text-nself-text-muted shrink-0 font-mono text-xs">
                                  {new Date(event.at).toLocaleTimeString()}
                                </span>
                              </li>
                            ))}
                          </ol>
                        )}
                        {incident.assignees.length > 0 && (
                          <p className="text-nself-text-muted mt-3 text-xs">
                            Assignees: {incident.assignees.join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
