'use client'

import { LogViewerSkeleton } from '@/components/skeletons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Filter, Pause, Play, RefreshCw, Search, Terminal } from 'lucide-react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  service: string
  message: string
}

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  debug: 'text-zinc-500',
}

function LogsContent() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [selectedService, setSelectedService] = useState('all')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [services, setServices] = useState<string[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedService !== 'all') params.set('service', selectedService)
      if (selectedLevel !== 'all') params.set('level', selectedLevel)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/docker/logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        if (data.services) setServices(data.services)
      }
    } catch (_error) {
      // Log fetching may fail if Docker is not running
    } finally {
      setLoading(false)
    }
  }, [selectedService, selectedLevel, searchQuery])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    if (streaming) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, streaming])

  const filteredLogs = logs.filter((log) => {
    if (selectedService !== 'all' && log.service !== selectedService) return false
    if (selectedLevel !== 'all' && log.level !== selectedLevel) return false
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  if (loading) {
    return <LogViewerSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Monitoring Logs</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Aggregated log viewer for all monitored services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStreaming(!streaming)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              streaming
                ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            {streaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {streaming ? 'Pause' : 'Stream'}
          </button>
          <button
            onClick={fetchLogs}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-400" />
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="all">All Services</option>
              {services.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>
          </div>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pr-3 pl-9 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <button className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            <Download className="h-4 w-4" />
            Export
          </button>
        </CardContent>
      </Card>

      {/* Log Output */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Log Output
          </CardTitle>
          <CardDescription>Showing {filteredLogs.length} log entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] overflow-y-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <p className="text-zinc-500">No logs to display.</p>
            ) : (
              filteredLogs.map((log, i) => (
                <div key={i} className="flex gap-2 border-b border-zinc-900 py-1 last:border-0">
                  <span className="shrink-0 text-zinc-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`shrink-0 uppercase ${LEVEL_COLORS[log.level] || 'text-zinc-400'}`}
                  >
                    [{log.level}]
                  </span>
                  <span className="shrink-0 text-cyan-400">{log.service}</span>
                  <span className="text-zinc-300">{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function MonitorLogsPage() {
  return (
    <Suspense fallback={<LogViewerSkeleton />}>
      <LogsContent />
    </Suspense>
  )
}
