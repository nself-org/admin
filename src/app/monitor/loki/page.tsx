'use client'

import { ChartSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Label } from '@/components/ui/label'
import { LogViewer } from '@/components/ui/log-viewer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Copy, Download, FileText, Filter, PlayCircle, RefreshCw } from 'lucide-react'
import { Suspense, useState } from 'react'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'debug'
  service: string
  message: string
}

function LokiContent() {
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [service, setService] = useState<string>('all')
  const [level, setLevel] = useState<string>('all')
  const [timeRange, setTimeRange] = useState('1h')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const services = [
    { value: 'all', label: 'All Services' },
    { value: 'postgres', label: 'PostgreSQL' },
    { value: 'hasura', label: 'Hasura' },
    { value: 'auth', label: 'Auth Service' },
    { value: 'functions', label: 'Functions' },
    { value: 'minio', label: 'MinIO' },
    { value: 'redis', label: 'Redis' },
    { value: 'nginx', label: 'Nginx' },
  ]

  const levels = [
    { value: 'all', label: 'All Levels' },
    { value: 'debug', label: 'Debug' },
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' },
  ]

  const handleBuildQuery = () => {
    let logql = '{job="nself"}'

    if (service !== 'all') {
      logql = `{job="nself", service="${service}"}`
    }

    if (level !== 'all') {
      logql += ` |= "${level}"`
    }

    setQuery(logql)
  }

  const handleExecuteQuery = async () => {
    if (!query) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/monitor/loki/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, range: timeRange }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Query failed')
      }

      setLogs(data.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute query')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const logText = logs
      .map(
        (log) => `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.service}] ${log.message}`
      )
      .join('\n')
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'loki-logs.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(query)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Loki Logs</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Query and stream logs using LogQL</p>
      </div>

      {/* Query Builder */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
          LogQL Query Builder
        </h2>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="service">Service</Label>
              <Select value={service} onValueChange={setService}>
                <SelectTrigger id="service">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {services.map((svc) => (
                    <SelectItem key={svc.value} value={svc.value}>
                      {svc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="level">Log Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger id="level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((lvl) => (
                    <SelectItem key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="timeRange">Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger id="timeRange">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5m">Last 5 minutes</SelectItem>
                  <SelectItem value="15m">Last 15 minutes</SelectItem>
                  <SelectItem value="1h">Last hour</SelectItem>
                  <SelectItem value="6h">Last 6 hours</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button variant="outline" onClick={handleBuildQuery}>
            <Filter className="mr-2 h-4 w-4" />
            Build Query from Filters
          </Button>

          {/* Custom Query */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="query">LogQL Query</Label>
              <Button variant="ghost" size="sm" onClick={handleCopyQuery} disabled={!query}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
            <Textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Enter LogQL query (e.g., {job="nself"} |= "error")'
              rows={3}
              className="font-mono"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button onClick={handleExecuteQuery} disabled={!query || loading}>
              <PlayCircle className="mr-2 h-4 w-4" />
              {loading ? 'Executing...' : 'Execute Query'}
            </Button>
            {logs.length > 0 && (
              <Button variant="outline" onClick={handleExport} disabled={loading}>
                <Download className="mr-2 h-4 w-4" />
                Export Logs
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900 dark:text-red-100">Query Failed</h3>
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
            <Button variant="outline" onClick={handleExecuteQuery}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Results */}
      {loading ? (
        <Card className="p-6">
          <Skeleton className="mb-4 h-6 w-48" />
          <Skeleton className="h-96 w-full" />
        </Card>
      ) : logs.length > 0 ? (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Log Stream</h2>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{logs.length} entries</span>
          </div>

          <LogViewer logs={logs} height="600px" />
        </Card>
      ) : (
        !error && (
          <EmptyState
            icon={FileText}
            title="No Logs"
            description="Execute a query to view log entries"
          />
        )
      )}
    </div>
  )
}

export default function LokiPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LokiContent />
    </Suspense>
  )
}
