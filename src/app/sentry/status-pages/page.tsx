'use client'

import { StatusBadge } from '@/components/sentry/StatusBadge'
import type { SentryStatus } from '@/components/sentry/StatusBadge'
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  PlusCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface StatusPage {
  id: string
  name: string
  slug: string
  publicUrl: string
  status: SentryStatus
  activeIncidents: number
  componentCount: number
  updatedAt: string
}

interface StatusPagesResponse {
  pages: StatusPage[]
  generatedAt: string
}

export default function SentryStatusPagesPage() {
  const [data, setData] = useState<StatusPagesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sentry/status-pages', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Server ${res.status}`)
      const json = (await res.json()) as StatusPagesResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status pages.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading && data === null) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div className="bg-nself-surface h-8 w-52 animate-pulse rounded-lg" />
        <div className="bg-nself-surface h-20 animate-pulse rounded-lg" />
        <div className="bg-nself-surface h-36 animate-pulse rounded-lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">
            ɳSentry — Status Pages
          </h1>
          {data !== null && (
            <p className="text-nself-text-muted mt-0.5 text-xs">
              {data.pages.length} page
              {data.pages.length !== 1 ? 's' : ''} · refreshed{' '}
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
            New Page
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

      {/* Pages list */}
      {data !== null && (
        <div className="glass-card p-4">
          <p className="text-nself-text mb-3 text-sm font-semibold">
            Status Pages ({data.pages.length})
          </p>
          {data.pages.length === 0 ? (
            <p className="text-nself-text-muted text-xs">
              No status pages yet. Create your first status page to communicate
              service health to users.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.pages.map((page) => (
                <li
                  key={page.id}
                  className="border-nself-border rounded-lg border px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-nself-text text-sm font-medium">
                          {page.name}
                        </p>
                        {page.activeIncidents > 0 && (
                          <span className="flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            {page.activeIncidents} incident
                            {page.activeIncidents !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-nself-text-muted font-mono text-xs">
                        /{page.slug} · {page.componentCount} component
                        {page.componentCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <StatusBadge status={page.status} className="shrink-0" />
                    <a
                      href={page.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-nself-text-muted hover:text-nself-text shrink-0 transition"
                      title="View public status page"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <p className="text-nself-text-muted mt-1.5 text-xs">
                    Last updated {new Date(page.updatedAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
