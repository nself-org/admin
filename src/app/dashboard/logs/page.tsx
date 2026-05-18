'use client'

import { Button } from '@/components/Button'
import { LogViewerSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  WifiOff,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

interface LogEntry {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  service: string
  message: string
  meta?: Record<string, unknown>
}

interface LogsData {
  entries: LogEntry[]
  total: number
  hasMore: boolean
  services: string[]
}

const LEVEL_COLORS: Record<LogEntry['level'], string> = {
  debug: 'text-gray-500',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
}

const LEVEL_BG: Record<LogEntry['level'], string> = {
  debug: 'bg-gray-500/10',
  info: 'bg-blue-500/10',
  warn: 'bg-yellow-500/10',
  error: 'bg-red-500/10',
}

function LogsContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<LogsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | LogEntry['level']>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [loadingMore, setLoadingMore] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const buildQuery = useCallback(
    (offset = 0) => {
      const params = new URLSearchParams({ limit: '100', offset: String(offset) })
      if (levelFilter !== 'all') params.set('level', levelFilter)
      if (serviceFilter !== 'all') params.set('service', serviceFilter)
      if (search.trim()) params.set('search', search.trim())
      return `/api/logs?${params.toString()}`
    },
    [levelFilter, serviceFilter, search]
  )

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch(buildQuery())
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg: string = body?.error ?? `Request failed: ${res.status}`
        if (msg.toLowerCase().includes('docker') || msg.toLowerCase().includes('connect')) {
          setOffline(true)
        } else {
          setError(msg)
        }
        return
      }
      setData(await res.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [buildQuery])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 5_000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, fetchLogs])

  async function loadMore() {
    if (!data) return
    setLoadingMore(true)
    try {
      const res = await fetch(buildQuery(data.entries.length))
      if (res.ok) {
        const more: LogsData = await res.json()
        setData((prev) => (prev ? { ...more, entries: [...prev.entries, ...more.entries] } : more))
      }
    } catch {
      // silently fail load-more
    } finally {
      setLoadingMore(false)
    }
  }

  function downloadLogs() {
    if (!data) return
    const lines = data.entries.map(
      (e) => `[${e.timestamp}] [${e.level.toUpperCase()}] [${e.service}] ${e.message}`
    )
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nself-logs-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // State 1: initial skeleton
  if (initialLoad && loading) return <LogViewerSkeleton />

  // State 5: offline
  if (offline) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <WifiOff className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach backend</p>
            <p className="mt-0.5 text-sm text-gray-400">Logs require a running nself stack.</p>
          </div>
        </div>
        <Button onClick={fetchLogs} disabled={loading} variant="secondary" size="sm">
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
            <p className="font-medium text-red-400">Failed to load logs</p>
            <p className="mt-0.5 text-sm text-gray-400">{error}</p>
          </div>
        </div>
        <Button onClick={fetchLogs} disabled={loading} variant="secondary" size="sm">
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
        <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No log data available.</p>
        <Button
          onClick={fetchLogs}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Load Logs
        </Button>
      </div>
    )
  }

  // States 6+7: success
  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">System Logs</h2>
          <p className="mt-1 text-sm text-gray-400">{data.total.toLocaleString()} total entries</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
              autoRefresh
                ? 'border-sky-500/30 bg-sky-500/20 text-sky-400'
                : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh'}
          </button>
          <Button onClick={downloadLogs} variant="secondary" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={fetchLogs} disabled={loading} variant="secondary" size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages…"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-sm text-white placeholder-gray-500 focus:border-sky-500/50 focus:outline-none"
          />
        </div>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as typeof levelFilter)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 focus:border-sky-500/50 focus:outline-none"
        >
          <option value="all">All levels</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        {data.services.length > 0 && (
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 focus:border-sky-500/50 focus:outline-none"
          >
            <option value="all">All services</option>
            {data.services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Log entries */}
      {data.entries.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p>No log entries match your filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/30 font-mono text-xs">
          <div className="max-h-[60vh] overflow-y-auto">
            {data.entries.map((entry) => (
              <div
                key={entry.id}
                className={`cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/5 ${
                  expandedId === entry.id ? 'bg-white/5' : ''
                }`}
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <div className="flex items-start gap-2 px-3 py-1.5">
                  <span className="w-20 flex-shrink-0 truncate text-gray-600">
                    {new Date(entry.timestamp).toTimeString().slice(0, 8)}
                  </span>
                  <span
                    className={`w-10 flex-shrink-0 font-bold uppercase ${LEVEL_COLORS[entry.level]}`}
                  >
                    {entry.level.slice(0, 4)}
                  </span>
                  <span className={`w-24 flex-shrink-0 truncate text-gray-500`}>
                    {entry.service}
                  </span>
                  <span className="break-all text-gray-300">{entry.message}</span>
                </div>
                {expandedId === entry.id && entry.meta && (
                  <div className={`mx-3 mb-2 rounded p-2 ${LEVEL_BG[entry.level]} text-gray-400`}>
                    <pre className="break-all whitespace-pre-wrap">
                      {JSON.stringify(entry.meta, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Load more */}
      {data.hasMore && (
        <div className="text-center">
          <Button onClick={loadMore} disabled={loadingMore} variant="secondary" size="sm">
            {loadingMore ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="mr-2 h-4 w-4" />
            )}
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<LogViewerSkeleton />}>
      <LogsContent />
    </Suspense>
  )
}
