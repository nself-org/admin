'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { LogViewerSkeleton } from '@/components/skeletons'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Archive,
  BarChart3,
  Bug,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Database,
  Download,
  FileText,
  Filter,
  Globe,
  Info,
  Layers,
  Loader2,
  Mail,
  MonitorSpeaker,
  Pause,
  Play,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  SplitSquareHorizontal,
  Terminal,
  TrendingUp,
  Volume2,
  VolumeX,
  XCircle,
  Zap,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

interface LogEntry {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical'
  service: string
  message: string
  metadata?: Record<string, any>
  source: string
  traceId?: string
  userId?: string
  requestId?: string
}

interface LogFilter {
  level: string[]
  services: string[]
  timeRange: string
  search: string
  regex: boolean
  caseSensitive: boolean
}

interface LogStats {
  total: number
  levels: Record<string, number>
  services: Record<string, number>
  timeDistribution: Array<{ time: string; count: number }>
  errorRate: number
}

const LOG_LEVELS = {
  debug: {
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    icon: Bug,
  },
  info: {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    icon: Info,
  },
  warn: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    icon: AlertTriangle,
  },
  error: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/20',
    icon: XCircle,
  },
  critical: {
    color: 'text-sky-500 dark:text-sky-400',
    bg: 'bg-sky-100 dark:bg-sky-900/20',
    icon: AlertCircle,
  },
}

const SERVICE_ICONS: Record<string, any> = {
  postgres: Database,
  hasura: Layers,
  auth: Shield,
  nginx: Globe,
  redis: Server,
  minio: Archive,
  nestjs: Activity,
  python: Terminal,
  golang: Zap,
  mailpit: Mail,
  grafana: BarChart3,
  prometheus: TrendingUp,
  loki: FileText,
  jaeger: Activity,
  default: MonitorSpeaker,
}

function LogEntry({
  entry,
  expanded,
  onToggle,
}: {
  entry: LogEntry
  expanded: boolean
  onToggle: () => void
}) {
  const levelConfig = LOG_LEVELS[entry.level]
  const Icon = levelConfig.icon
  const ServiceIcon = SERVICE_ICONS[entry.service] || SERVICE_ICONS.default

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="border-b border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50">
      <div className="flex items-start gap-3 p-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onToggle}
            className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <Icon className={`h-4 w-4 ${levelConfig.color}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-3">
            <span className="font-mono text-xs text-zinc-500">
              {formatTimestamp(entry.timestamp)}
            </span>
            <div className="flex items-center gap-1">
              <ServiceIcon className="h-3 w-3 text-zinc-400" />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {entry.service}
              </span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${levelConfig.bg} ${levelConfig.color}`}
            >
              {entry.level.toUpperCase()}
            </span>
          </div>

          <div className="font-mono text-sm break-words text-zinc-900 dark:text-white">
            {entry.message}
          </div>

          {entry.traceId && (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-zinc-500">Trace:</span>
              <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                {entry.traceId}
              </span>
              <button
                onClick={() => copyToClipboard(entry.traceId!)}
                className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => copyToClipboard(JSON.stringify(entry, null, 2))}
            className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && entry.metadata && Object.keys(entry.metadata).length > 0 && (
        <div className="ml-9 px-4 pb-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
            <h4 className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Metadata
            </h4>
            <pre className="overflow-x-auto text-xs text-zinc-800 dark:text-zinc-200">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function LogFilters({
  filters,
  onChange,
  services,
}: {
  filters: LogFilter
  onChange: (filters: LogFilter) => void
  services: string[]
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-medium">
          <Filter className="h-4 w-4" />
          Filters
        </h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          {showAdvanced ? 'Basic' : 'Advanced'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Search */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Search
          </label>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="Search log messages..."
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pr-4 pl-10 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>

        {/* Level Filter */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Log Levels
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.keys(LOG_LEVELS).map((level) => {
              const config = LOG_LEVELS[level as keyof typeof LOG_LEVELS]
              const isSelected = filters.level.includes(level)
              return (
                <button
                  key={level}
                  onClick={() => {
                    const newLevels = isSelected
                      ? filters.level.filter((l) => l !== level)
                      : [...filters.level, level]
                    onChange({ ...filters, level: newLevels })
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? `${config.bg} ${config.color} border-current`
                      : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  {level.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>

        {/* Service Filter */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Services
          </label>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {services.map((service) => {
              const Icon = SERVICE_ICONS[service] || SERVICE_ICONS.default
              const isSelected = filters.services.includes(service)
              return (
                <button
                  key={service}
                  onClick={() => {
                    const newServices = isSelected
                      ? filters.services.filter((s) => s !== service)
                      : [...filters.services, service]
                    onChange({ ...filters, services: newServices })
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    isSelected
                      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {service}
                </button>
              )
            })}
          </div>
        </div>

        {/* Time Range */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Time Range
          </label>
          <select
            value={filters.timeRange}
            onChange={(e) =>
              onChange({ ...filters, timeRange: e.target.value })
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {showAdvanced && (
          <div className="space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.regex}
                  onChange={(e) =>
                    onChange({ ...filters, regex: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-blue-600"
                />
                <span className="text-sm">Regular expression</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.caseSensitive}
                  onChange={(e) =>
                    onChange({ ...filters, caseSensitive: e.target.checked })
                  }
                  className="h-4 w-4 rounded text-blue-600"
                />
                <span className="text-sm">Case sensitive</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() =>
              onChange({
                level: Object.keys(LOG_LEVELS),
                services: [],
                timeRange: '24h',
                search: '',
                regex: false,
                caseSensitive: false,
              })
            }
            variant="outline"
            className="text-xs"
          >
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  )
}

function LogStats({ stats }: { stats: LogStats }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Total Logs
            </p>
            <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
          </div>
          <FileText className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Error Rate
            </p>
            <p className="text-2xl font-bold text-red-600">
              {stats.errorRate.toFixed(2)}%
            </p>
          </div>
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Errors</p>
            <p className="text-2xl font-bold text-red-600">
              {stats.levels.error || 0}
            </p>
          </div>
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Warnings</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.levels.warn || 0}
            </p>
          </div>
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
        </div>
      </div>
    </div>
  )
}

function LogRetentionSettings() {
  const [retention, setRetention] = useState({
    enabled: true,
    days: 30,
    maxSize: 10, // GB
    compressionEnabled: true,
    autoCleanup: true,
  })

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <h3 className="mb-4 flex items-center gap-2 font-medium">
        <Settings className="h-4 w-4" />
        Log Retention
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Log Retention</label>
            <p className="text-xs text-zinc-500">
              Automatically manage log storage
            </p>
          </div>
          <input
            type="checkbox"
            checked={retention.enabled}
            onChange={(e) =>
              setRetention({ ...retention, enabled: e.target.checked })
            }
            className="h-4 w-4 rounded text-blue-600"
          />
        </div>

        {retention.enabled && (
          <div className="ml-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Retention (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={retention.days}
                  onChange={(e) =>
                    setRetention({
                      ...retention,
                      days: parseInt(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Max Size (GB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={retention.maxSize}
                  onChange={(e) =>
                    setRetention({
                      ...retention,
                      maxSize: parseInt(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={retention.compressionEnabled}
                  onChange={(e) =>
                    setRetention({
                      ...retention,
                      compressionEnabled: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded text-blue-600"
                />
                <span className="text-sm">Enable compression</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={retention.autoCleanup}
                  onChange={(e) =>
                    setRetention({
                      ...retention,
                      autoCleanup: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded text-blue-600"
                />
                <span className="text-sm">Auto cleanup old logs</span>
              </label>
            </div>
          </div>
        )}

        <Button className="text-sm">Save Settings</Button>
      </div>
    </div>
  )
}

function SystemLogsContent() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<LogFilter>({
    level: ['info', 'warn', 'error', 'critical'],
    services: [],
    timeRange: '24h',
    search: '',
    regex: false,
    caseSensitive: false,
  })
  const [stats, setStats] = useState<LogStats>({
    total: 0,
    levels: {},
    services: {},
    timeDistribution: [],
    errorRate: 0,
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [autoScroll, setAutoScroll] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const [followMode, setFollowMode] = useState(false)

  const logContainerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const services = [
    'postgres',
    'hasura',
    'auth',
    'nginx',
    'redis',
    'minio',
    'nestjs',
    'python',
    'golang',
    'mailpit',
  ]

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        levels: filters.level.join(','),
        services: filters.services.join(','),
        timeRange: filters.timeRange,
        search: filters.search,
        regex: filters.regex.toString(),
        caseSensitive: filters.caseSensitive.toString(),
      })

      const response = await fetch(`/api/system/logs?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
        setStats(data.stats)
        setTotalPages(Math.ceil(data.total / pageSize))
      }
    } catch (_error) {
      // Intentionally empty - logs fetch failure handled silently
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters])

  const startStreaming = useCallback(() => {
    if (wsRef.current) return

    const ws = new WebSocket(`ws://localhost:3000/api/system/logs/stream`)
    wsRef.current = ws

    ws.onopen = () => {
      setStreaming(true)
      ws.send(JSON.stringify({ filters }))
    }

    ws.onmessage = (event) => {
      const newLog = JSON.parse(event.data)
      setLogs((prev) => [newLog, ...prev.slice(0, pageSize - 1)])

      if (
        soundEnabled &&
        (newLog.level === 'error' || newLog.level === 'critical')
      ) {
        // Play notification sound
        const audio = new Audio('/sounds/alert.wav')
        audio.play().catch(() => {}) // Ignore audio play errors
      }

      if (autoScroll && logContainerRef.current) {
        logContainerRef.current.scrollTop = 0
      }
    }

    ws.onclose = () => {
      setStreaming(false)
      wsRef.current = null
    }

    ws.onerror = () => {
      setStreaming(false)
      wsRef.current = null
    }
  }, [filters, pageSize, soundEnabled, autoScroll])

  const stopStreaming = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setStreaming(false)
  }, [])

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        levels: filters.level.join(','),
        services: filters.services.join(','),
        timeRange: filters.timeRange,
        search: filters.search,
        format: 'csv',
      })

      const response = await fetch(`/api/system/logs/export?${params}`)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (_error) {
      // Intentionally empty - export errors handled silently
    }
  }

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    if (followMode) {
      startStreaming()
    } else {
      stopStreaming()
    }

    return () => stopStreaming()
  }, [followMode, startStreaming, stopStreaming])

  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-zinc-900 dark:text-white">
                <FileText className="h-8 w-8 text-blue-500" />
                System Logs
              </h1>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Monitor and analyze system logs in real-time
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setFollowMode(!followMode)}
                variant={followMode ? 'primary' : 'outline'}
                className="flex items-center gap-2"
              >
                {followMode ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {followMode ? 'Stop' : 'Follow'}
              </Button>

              <Button
                onClick={() => setSoundEnabled(!soundEnabled)}
                variant="outline"
                className="flex items-center gap-2"
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </Button>

              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <SplitSquareHorizontal className="h-4 w-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>

              <Button
                onClick={exportLogs}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>

              <Button
                onClick={fetchLogs}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <LogStats stats={stats} />
        </div>

        <div
          className={`grid gap-6 ${showFilters ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1'}`}
        >
          {showFilters && (
            <div className="space-y-6">
              <LogFilters
                filters={filters}
                onChange={setFilters}
                services={services}
              />
              <LogRetentionSettings />
            </div>
          )}

          <div className={showFilters ? 'lg:col-span-3' : 'col-span-1'}>
            <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-700">
                <div className="flex items-center gap-4">
                  <h3 className="font-medium">
                    Log Entries
                    {streaming && (
                      <span className="ml-2 inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                        Live
                      </span>
                    )}
                  </h3>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {stats.total.toLocaleString()} total entries
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value))}
                    className="rounded border border-zinc-200 bg-white px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={200}>200 per page</option>
                  </select>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    Auto-scroll
                  </label>
                </div>
              </div>

              <div
                ref={logContainerRef}
                className="max-h-[600px] overflow-y-auto"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                      Loading logs...
                    </span>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
                    <p className="text-zinc-600 dark:text-zinc-400">
                      No logs found matching your filters
                    </p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <LogEntry
                      key={log.id}
                      entry={log}
                      expanded={expandedLogs.has(log.id)}
                      onToggle={() => toggleLogExpansion(log.id)}
                    />
                  ))
                )}
              </div>

              {!streaming && totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-200 p-4 dark:border-zinc-700">
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Page {page} of {totalPages}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      variant="outline"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      variant="outline"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      variant="outline"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                      variant="outline"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
export default function SystemLogsPage() {
  return (
    <Suspense fallback={<LogViewerSkeleton />}>
      <SystemLogsContent />
    </Suspense>
  )
}
