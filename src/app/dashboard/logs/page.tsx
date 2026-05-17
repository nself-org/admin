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

  const buildQuery = useCallback((offset = 0) => {
    const params = new URLSearchParams({ limit: '100', offset: String(offset) })
    if (levelFilter !== 'all') params.set('level', levelFilter)
    if (serviceFilter !== 'all') params.set('service', serviceFilter)
    if (search.trim()) params.set('search', search.trim())
    return `/api/logs?${params.toString()}`
  }, [levelFilter, serviceFilter, search])

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
        setData((prev) => prev
          ? { ...more, entries: [...prev.entries, ...more.entries] }
          : more
        )
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
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <WifiOff className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach backend</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Logs require a running nself stack.
            </p>
          </div>
        </div>
        <Button onClick={fetchLogs} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: error
  if (error && !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-400">Failed to load logs</p>
            <p className="text-sm text-gray-400 mt-0.5">{error}</p>
          </div>
        </div>
        <Button onClick={fetchLogs} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: no data
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No log data available.</p>
        <Button onClick={fetchLogs} disabled={loading} variant="secondary" size="sm" className="mt-3">
          <RefreshCw className="h-4 w-4 mr-2" />
          Load Logs
        </Button>
      </div>
    )
  }

  // States 6+7: success
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">System Logs</h2>
          <p className="text-sm text-gray-400 mt-1">
            {data.total.toLocaleString()} total entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
              autoRefresh
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh'}
          </button>
          <Button onClick={downloadLogs} variant="secondary" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={fetchLogs} disabled={loading} variant="secondary" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages…"
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-sky-500/50"
          />
        </div>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as typeof levelFilter)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-sky-500/50"
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
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-sky-500/50"
          >
            <option value="all">All services</option>
            {data.services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* Log entries */}
      {data.entries.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No log entries match your filters.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-black/30 font-mono text-xs overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            {data.entries.map((entry) => (
              <div
                key={entry.id}
                className={`border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors ${
                  expandedId === entry.id ? 'bg-white/5' : ''
                }`}
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <div className="flex items-start gap-2 px-3 py-1.5">
                  <span className="text-gray-600 flex-shrink-0 w-20 truncate">
                    {new Date(entry.timestamp).toTimeString().slice(0, 8)}
                  </span>
                  <span className={`flex-shrink-0 w-10 uppercase font-bold ${LEVEL_COLORS[entry.level]}`}>
                    {entry.level.slice(0, 4)}
                  </span>
                  <span className={`flex-shrink-0 text-gray-500 w-24 truncate`}>
                    {entry.service}
                  </span>
                  <span className="text-gray-300 break-all">{entry.message}</span>
                </div>
                {expandedId === entry.id && entry.meta && (
                  <div className={`mx-3 mb-2 p-2 rounded ${LEVEL_BG[entry.level]} text-gray-400`}>
                    <pre className="whitespace-pre-wrap break-all">
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
          <Button
            onClick={loadMore}
            disabled={loadingMore}
            variant="secondary"
            size="sm"
          >
            {loadingMore ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-2" />
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
