'use client'

import { Button } from '@/components/Button'
import { CodeEditorSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Code2,
  ExternalLink,
  Globe,
  Play,
  RefreshCw,
  Search,
  WifiOff,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

interface ServiceUrl {
  name: string
  label: string
  url: string
  type: 'graphql' | 'rest' | 'admin' | 'auth' | 'storage' | 'other'
}

interface EndpointResult {
  status: number
  ok: boolean
  body: string
  latencyMs: number
  error?: string
}

interface UrlsData {
  urls: Record<string, string>
  raw?: string
}

const ENDPOINT_LABELS: Record<string, { label: string; type: ServiceUrl['type'] }> = {
  hasura: { label: 'Hasura GraphQL', type: 'graphql' },
  graphql: { label: 'GraphQL API', type: 'graphql' },
  auth: { label: 'Auth Service', type: 'auth' },
  storage: { label: 'Storage API', type: 'storage' },
  functions: { label: 'Functions', type: 'rest' },
  minio: { label: 'MinIO Console', type: 'admin' },
  mailhog: { label: 'MailHog', type: 'admin' },
  redis: { label: 'Redis', type: 'other' },
}

function parseServiceUrls(data: UrlsData): ServiceUrl[] {
  const urls = data.urls ?? {}
  return Object.entries(urls)
    .filter(([, url]) => url && url.startsWith('http'))
    .map(([name, url]) => {
      const meta = ENDPOINT_LABELS[name.toLowerCase()] ?? {
        label: name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        type: 'other' as const,
      }
      return { name, label: meta.label, url, type: meta.type }
    })
}

const TYPE_COLORS: Record<ServiceUrl['type'], string> = {
  graphql: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  rest: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  admin: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  auth: 'text-green-400 bg-green-500/10 border-green-500/30',
  storage: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  other: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
}

function ApiContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<UrlsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [search, setSearch] = useState('')
  const [testing, setTesting] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, EndpointResult>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const fetchUrls = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const response = await fetch('/api/nself/urls')
      if (response.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const msg: string = body?.error ?? `Request failed: ${response.status}`
        if (msg.toLowerCase().includes('docker') || msg.toLowerCase().includes('connect')) {
          setOffline(true)
        } else {
          setError(msg)
        }
        return
      }
      setData(await response.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchUrls()
  }, [fetchUrls])

  const services = useMemo(() => {
    if (!data) return []
    return parseServiceUrls(data)
  }, [data])

  const filtered = useMemo(() => {
    if (!search.trim()) return services
    const q = search.toLowerCase()
    return services.filter(
      (s) =>
        s.label.toLowerCase().includes(q) || s.url.toLowerCase().includes(q) || s.type.includes(q)
    )
  }, [services, search])

  async function testEndpoint(service: ServiceUrl) {
    setTesting(service.name)
    const start = performance.now()
    try {
      const res = await fetch(service.url, {
        method: 'GET',
        signal: AbortSignal.timeout(10_000),
      })
      const latencyMs = Math.round(performance.now() - start)
      let body = ''
      try {
        body = await res.text()
        if (body.length > 2000) body = body.slice(0, 2000) + '\n…(truncated)'
      } catch {
        body = '(no body)'
      }
      setResults((prev) => ({
        ...prev,
        [service.name]: { status: res.status, ok: res.ok, body, latencyMs },
      }))
      setExpanded((prev) => ({ ...prev, [service.name]: true }))
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start)
      setResults((prev) => ({
        ...prev,
        [service.name]: {
          status: 0,
          ok: false,
          body: '',
          latencyMs,
          error: err instanceof Error ? err.message : 'Request failed',
        },
      }))
      setExpanded((prev) => ({ ...prev, [service.name]: true }))
    } finally {
      setTesting(null)
    }
  }

  // State 1: initial skeleton
  if (initialLoad && loading) return <CodeEditorSkeleton />

  // State 5: offline
  if (offline) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <WifiOff className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach nself CLI</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Verify the nself binary is installed and services are running.
            </p>
          </div>
        </div>
        <Button onClick={fetchUrls} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: error
  if (error && !data) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-red-400">Failed to load service URLs</p>
            <p className="mt-0.5 text-sm text-gray-400">{error}</p>
          </div>
        </div>
        <Button onClick={fetchUrls} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: no data
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Globe className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No service information available.</p>
        <Button
          onClick={fetchUrls}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Load Services
        </Button>
      </div>
    )
  }

  // States 6+7: success
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">API Explorer</h2>
          <p className="mt-1 text-sm text-gray-400">
            {services.length} service{services.length !== 1 ? 's' : ''} discovered
          </p>
        </div>
        <Button onClick={fetchUrls} disabled={loading} variant="secondary" size="sm">
          {/* State 2: refresh spinner */}
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {/* Search */}
      {services.length > 4 && (
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pr-4 pl-9 text-sm text-white placeholder-gray-500 transition-colors focus:border-sky-500/50 focus:outline-none"
          />
        </div>
      )}

      {/* Service list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <Globe className="mx-auto mb-2 h-8 w-8 text-gray-400 opacity-30" />
          {search ? (
            <>
              <p className="text-gray-400">No services match &ldquo;{search}&rdquo;</p>
              <button
                onClick={() => setSearch('')}
                className="mt-2 text-xs text-sky-400 transition-colors hover:text-sky-300"
              >
                Clear search
              </button>
            </>
          ) : (
            <p className="text-gray-400">No services running. Start nself to see endpoints.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((service) => {
            const result = results[service.name]
            const isExpanded = expanded[service.name]
            const isTesting = testing === service.name
            return (
              <div
                key={service.name}
                className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]"
              >
                {/* Service row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <Globe className="h-4 w-4 flex-shrink-0 text-gray-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">{service.label}</span>
                      <span
                        className={`rounded border px-1.5 py-0.5 font-mono text-xs ${TYPE_COLORS[service.type]}`}
                      >
                        {service.type}
                      </span>
                      {result && (
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-xs ${
                            result.ok
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {result.error ? 'ERR' : result.status} · {result.latencyMs}ms
                        </span>
                      )}
                    </div>
                    <a
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 flex items-center gap-1 font-mono text-xs text-sky-400 transition-colors hover:text-sky-300"
                    >
                      {service.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Button
                      onClick={() => testEndpoint(service)}
                      disabled={isTesting}
                      variant="secondary"
                      size="sm"
                    >
                      {isTesting ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1.5 text-xs">{isTesting ? 'Testing…' : 'Test'}</span>
                    </Button>
                    {result && (
                      <button
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [service.name]: !prev[service.name] }))
                        }
                        className="text-gray-500 transition-colors hover:text-gray-300"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Result panel */}
                {result && isExpanded && (
                  <div className="space-y-2 border-t border-white/10 px-4 py-3">
                    {result.error ? (
                      <div className="flex items-center gap-2 text-sm text-red-400">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>{result.error}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>
                            Status:{' '}
                            <span className={result.ok ? 'text-green-400' : 'text-red-400'}>
                              {result.status}
                            </span>
                          </span>
                          <span>Latency: {result.latencyMs}ms</span>
                        </div>
                        {result.body && (
                          <div className="flex items-start gap-2">
                            <Code2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                            <pre className="max-h-48 flex-1 overflow-auto font-mono text-xs whitespace-pre-wrap text-gray-300">
                              {result.body}
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Note about GraphQL */}
      {services.some((s) => s.type === 'graphql') && (
        <p className="text-xs text-gray-500">
          For full GraphQL query/mutation testing, use the{' '}
          <a href="/dev/graphql" className="text-sky-400 transition-colors hover:text-sky-300">
            GraphQL Explorer
          </a>
          .
        </p>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<CodeEditorSkeleton />}>
      <ApiContent />
    </Suspense>
  )
}
