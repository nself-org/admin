'use client'

import { Button } from '@/components/Button'
import { TableSkeleton } from '@/components/skeletons'
import { AlertTriangle, CheckCircle, ExternalLink, RefreshCw, WifiOff, XCircle } from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface ServiceUrl {
  name: string
  url: string
  reachable?: boolean
  latencyMs?: number
  error?: string
}

interface UrlsResult {
  urls: ServiceUrl[]
  projectPath: string
  rawOutput?: string
}

function UrlsContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<UrlsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

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

  // State 1: Initial skeleton
  if (initialLoad && loading) return <TableSkeleton />

  // State 5: Offline
  if (offline) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <WifiOff className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-400">Docker not reachable</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Make sure the nself stack is running before fetching service URLs.
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

  // State 4: Error
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

  // State 3: No data yet
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>No URL data available.</p>
        <Button
          onClick={fetchUrls}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Load URLs
        </Button>
      </div>
    )
  }

  const reachableCount = data.urls.filter((u) => u.reachable).length
  const unreachableCount = data.urls.filter((u) => u.reachable === false).length
  const pendingCount = data.urls.filter((u) => u.reachable === undefined).length

  // States 6 + 7: Empty or with data
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Service URLs</h2>
          <p className="mt-1 font-mono text-sm text-gray-400">{data.projectPath}</p>
        </div>
        <Button onClick={fetchUrls} disabled={loading} variant="secondary" size="sm">
          {/* State 2: Refresh spinner */}
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Summary cards */}
      {data.urls.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-center">
            <p className="font-mono text-2xl font-bold text-green-400">{reachableCount}</p>
            <p className="mt-1 text-xs text-gray-400">Reachable</p>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center">
            <p className="font-mono text-2xl font-bold text-red-400">{unreachableCount}</p>
            <p className="mt-1 text-xs text-gray-400">Unreachable</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
            <p className="font-mono text-2xl font-bold text-gray-300">
              {pendingCount + data.urls.length}
            </p>
            <p className="mt-1 text-xs text-gray-400">Total</p>
          </div>
        </div>
      )}

      {/* URL table — State 3 empty variant */}
      {data.urls.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400">No service URLs found.</p>
          <p className="mt-1 text-sm text-gray-500">
            Run <code className="font-mono text-sky-400">nself urls</code> from your project to
            confirm URLs are defined.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left font-medium text-gray-400">Service</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">URL</th>
                <th className="px-4 py-3 text-center font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-400">Latency</th>
              </tr>
            </thead>
            <tbody>
              {data.urls.map((svc, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-white">{svc.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    {svc.url ? (
                      <a
                        href={svc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-xs text-sky-400 transition-colors hover:text-sky-300"
                      >
                        {svc.url}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-500 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {svc.reachable === undefined ? (
                      <span className="text-xs text-gray-500">—</span>
                    ) : svc.reachable ? (
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-green-400">OK</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1" title={svc.error}>
                        <XCircle className="h-4 w-4 text-red-400" />
                        <span className="text-xs text-red-400">Down</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {svc.latencyMs !== undefined ? (
                      <span
                        className={`font-mono text-xs ${svc.latencyMs < 200 ? 'text-green-400' : svc.latencyMs < 1000 ? 'text-yellow-400' : 'text-red-400'}`}
                      >
                        {svc.latencyMs}ms
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function UrlsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <UrlsContent />
    </Suspense>
  )
}
