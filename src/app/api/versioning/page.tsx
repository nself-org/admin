'use client'

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// Shape returned by GET /api/deprecation-registry.json on ping.nself.org
interface DeprecatedEndpoint {
  path: string
  deprecated_in: string
  removed_in: string
  replacement: string
  reason: string
  sunset_header: string
}

interface PluginVersionEntry {
  name: string
  api_version: string
  deprecated_endpoints: DeprecatedEndpoint[]
}

interface DeprecationRegistry {
  schema_version: string
  generated_at: string
  lts_baseline: string
  lts_window_end: string
  plugins: PluginVersionEntry[]
}

function StatusBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-400">
        <CheckCircle2 className="h-3 w-3" /> current
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/40 px-2 py-0.5 text-xs text-amber-400">
      <AlertTriangle className="h-3 w-3" /> {count} deprecated
    </span>
  )
}

export default function APIVersioningPage() {
  const [registry, setRegistry] = useState<DeprecationRegistry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Try the live ping_api endpoint; fall back gracefully.
      const url = process.env.NEXT_PUBLIC_PING_API_URL
        ? `${process.env.NEXT_PUBLIC_PING_API_URL}/api/deprecation-registry.json`
        : 'https://ping.nself.org/api/deprecation-registry.json'
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Registry returned HTTP ${res.status}`)
      const data = (await res.json()) as DeprecationRegistry
      setRegistry(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load registry.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = registry?.plugins.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  )

  const totalDeprecated =
    registry?.plugins.reduce((n, p) => n + p.deprecated_endpoints.length, 0) ??
    0

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">
            API Versioning
          </h1>
          <p className="text-nself-text-muted mt-1 text-sm">
            Plugin API versions and deprecation sunset calendar (G2&ndash;G11)
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      {registry && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-nself-text-muted text-xs tracking-wide uppercase">
              Plugins tracked
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {registry.plugins.length}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-nself-text-muted text-xs tracking-wide uppercase">
              Deprecated endpoints
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-400">
              {totalDeprecated}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-nself-text-muted text-xs tracking-wide uppercase">
              LTS window ends
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {registry.lts_window_end}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800/40 bg-red-900/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !registry && (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading registry from ping.nself.org...
        </div>
      )}

      {/* Search */}
      {registry && (
        <input
          type="search"
          placeholder="Filter plugins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:ring-1 focus:ring-sky-500 focus:outline-none"
        />
      )}

      {/* Plugin table */}
      {filtered && filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-xs tracking-wide text-white/50 uppercase">
                <th className="px-4 py-3">Plugin</th>
                <th className="px-4 py-3">API Version</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deprecated Endpoints</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((plugin) => (
                <>
                  <tr key={plugin.name} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-white">
                      {plugin.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-sky-400">
                      v{plugin.api_version}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge count={plugin.deprecated_endpoints.length} />
                    </td>
                    <td className="px-4 py-3 text-white/50">
                      {plugin.deprecated_endpoints.length === 0
                        ? '—'
                        : plugin.deprecated_endpoints
                            .map((ep) => ep.path)
                            .join(', ')}
                    </td>
                  </tr>
                  {plugin.deprecated_endpoints.map((ep) => (
                    <tr
                      key={`${plugin.name}-${ep.path}`}
                      className="bg-amber-900/10"
                    >
                      <td
                        className="px-4 py-2 pl-8 text-xs text-white/40"
                        colSpan={1}
                      />
                      <td
                        className="px-4 py-2 text-xs text-white/40"
                        colSpan={3}
                      >
                        <span className="mr-3 font-mono text-amber-400">
                          {ep.path}
                        </span>
                        <span className="mr-3">
                          deprecated in v{ep.deprecated_in}
                        </span>
                        <span className="mr-3 text-red-400">
                          removed in v{ep.removed_in}
                        </span>
                        {ep.replacement && (
                          <span className="mr-3 text-green-400">
                            use: {ep.replacement}
                          </span>
                        )}
                        {ep.sunset_header && (
                          <span className="inline-flex items-center gap-1 text-white/30">
                            <Clock className="h-3 w-3" />
                            Sunset: {ep.sunset_header}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered && filtered.length === 0 && !loading && (
        <p className="text-sm text-white/40">
          No plugins match &ldquo;{search}&rdquo;.
        </p>
      )}

      {/* Footer */}
      {registry && (
        <p className="text-xs text-white/30">
          Registry fetched at {new Date(registry.generated_at).toLocaleString()}
          {' · '}
          <a
            href="https://docs.nself.org/api/versioning"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-white/60"
          >
            API versioning docs
          </a>
          {' · '}
          <code className="rounded bg-white/5 px-1">
            nself api changelog &lt;plugin&gt;
          </code>
        </p>
      )}
    </div>
  )
}
