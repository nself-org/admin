'use client'

import { Button } from '@/components/Button'
import { TableSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  WifiOff,
  XCircle,
} from 'lucide-react'
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
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <WifiOff className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-400">Docker not reachable</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Make sure the nself stack is running before fetching service URLs.
            </p>
          </div>
        </div>
        <Button onClick={fetchUrls} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: Error
  if (error && !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-400">Failed to load service URLs</p>
            <p className="text-sm text-gray-400 mt-0.5">{error}</p>
          </div>
        </div>
        <Button onClick={fetchUrls} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
        <Button onClick={fetchUrls} disabled={loading} variant="secondary" size="sm" className="mt-3">
          <RefreshCw className="h-4 w-4 mr-2" />
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Service URLs</h2>
          <p className="text-sm text-gray-400 mt-1 font-mono">{data.projectPath}</p>
        </div>
        <Button
          onClick={fetchUrls}
          disabled={loading}
          variant="secondary"
          size="sm"
        >
          {/* State 2: Refresh spinner */}
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Summary cards */}
      {data.urls.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-center">
            <p className="text-2xl font-mono font-bold text-green-400">{reachableCount}</p>
            <p className="text-xs text-gray-400 mt-1">Reachable</p>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center">
            <p className="text-2xl font-mono font-bold text-red-400">{unreachableCount}</p>
            <p className="text-xs text-gray-400 mt-1">Unreachable</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-mono font-bold text-gray-300">{pendingCount + data.urls.length}</p>
            <p className="text-xs text-gray-400 mt-1">Total</p>
          </div>
        </div>
      )}

      {/* URL table — State 3 empty variant */}
      {data.urls.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400">No service URLs found.</p>
          <p className="text-sm text-gray-500 mt-1">
            Run <code className="font-mono text-sky-400">nself urls</code> from your project to confirm URLs are defined.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Service</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">URL</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Latency</th>
              </tr>
            </thead>
            <tbody>
              {data.urls.map((svc, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
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
                        className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-mono text-xs transition-colors"
                      >
                        {svc.url}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-gray-500 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {svc.reachable === undefined ? (
                      <span className="text-gray-500 text-xs">—</span>
                    ) : svc.reachable ? (
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-green-400 text-xs">OK</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1" title={svc.error}>
                        <XCircle className="h-4 w-4 text-red-400" />
                        <span className="text-red-400 text-xs">Down</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {svc.latencyMs !== undefined ? (
                      <span className={`font-mono text-xs ${svc.latencyMs < 200 ? 'text-green-400' : svc.latencyMs < 1000 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {svc.latencyMs}ms
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">—</span>
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
