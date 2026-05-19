'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { LogFilters, LogFilters as LogFiltersType } from '@/components/logs/LogFilters'
import { LogEntry } from '@/components/logs/LogLine'
import { LogStream } from '@/components/logs/LogStream'
import { LogViewerSkeleton } from '@/components/logs/LogViewerSkeleton'
import { ServiceSelector } from '@/components/logs/ServiceSelector'
import { getWebSocketClient } from '@/lib/websocket/client'
import { EventType, LogStreamEvent } from '@/lib/websocket/events'
import {
  AlertCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  Share2,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

const MAX_LOGS = 10000
const THROTTLE_INTERVAL = 100 // 100ms = max 10 lines/s

interface LogInsights {
  errorCount: number
  warningCount: number
  patterns: Array<{ message: string; count: number }>
}

function LogsContent() {
  const [services, setServices] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [recentServices, setRecentServices] = useState<string[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [bufferedLogs, setBufferedLogs] = useState<LogEntry[]>([])
  const [filters, setFilters] = useState<LogFiltersType>({
    searchText: '',
    level: 'all',
    timeRange: '5m',
    regexEnabled: false,
  })
  const [autoScroll, setAutoScroll] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'disconnected'
  >('connecting')

  // Load available services
  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch('/api/project/services-detail')
        if (res.ok) {
          const data = await res.json()
          const raw = data.services ?? {}
          const serviceNames = Array.isArray(raw)
            ? (raw as { name: string }[]).map((s) => s.name)
            : Object.values(raw as Record<string, { name: string }>).map((s) => s.name)
          setServices(serviceNames)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Failed to load services:', error)
        setIsLoading(false)
      }
    }

    loadServices()
  }, [])

  // WebSocket connection for real-time logs
  useEffect(() => {
    const wsClient = getWebSocketClient()

    const unsubscribeStatus = wsClient.onStatusChange((status) => {
      if (status.connected) {
        setConnectionStatus('connected')
      } else if (status.reconnecting) {
        setConnectionStatus('connecting')
      } else {
        setConnectionStatus('disconnected')
      }
    })

    wsClient.connect()

    const unsubscribeLogs = wsClient.on<LogStreamEvent>(EventType.LOGS_STREAM, (event) => {
      const newLog: LogEntry = {
        id: `${event.service}-${Date.now()}-${Math.random()}`,
        service: event.service,
        line: event.line,
        timestamp: event.timestamp,
        level: event.level || 'info',
        source: event.source,
      }

      // Add to buffer for throttling
      setBufferedLogs((prev) => [...prev, newLog])
    })

    // Join log rooms for selected services
    if (selectedServices.length > 0) {
      selectedServices.forEach((service) => {
        wsClient.joinRoom(`logs:${service}`)
      })
    } else {
      // Join room for all services
      wsClient.joinRoom('logs:all')
    }

    return () => {
      unsubscribeStatus()
      unsubscribeLogs()

      // Leave rooms
      if (selectedServices.length > 0) {
        selectedServices.forEach((service) => {
          wsClient.leaveRoom(`logs:${service}`)
        })
      } else {
        wsClient.leaveRoom('logs:all')
      }
    }
  }, [selectedServices])

  // Throttle log updates
  useEffect(() => {
    if (bufferedLogs.length === 0) return

    const interval = setInterval(() => {
      setBufferedLogs((buffer) => {
        if (buffer.length === 0) return buffer

        // Take up to 10 logs at a time
        const logsToAdd = buffer.slice(0, 10)
        const remaining = buffer.slice(10)

        setLogs((prev) => {
          const combined = [...prev, ...logsToAdd]
          // Keep only last MAX_LOGS
          if (combined.length > MAX_LOGS) {
            return combined.slice(-MAX_LOGS)
          }
          return combined
        })

        return remaining
      })
    }, THROTTLE_INTERVAL)

    return () => clearInterval(interval)
  }, [bufferedLogs.length])

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = logs

    // Filter by selected services
    if (selectedServices.length > 0) {
      result = result.filter((log) => selectedServices.includes(log.service))
    }

    // Filter by level
    if (filters.level !== 'all') {
      result = result.filter((log) => log.level === filters.level)
    }

    // Filter by time range
    const now = Date.now()
    const timeRanges = {
      '5m': 5 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    }

    if (filters.timeRange !== 'custom') {
      const range = timeRanges[filters.timeRange]
      result = result.filter((log) => now - new Date(log.timestamp).getTime() < range)
    } else if (filters.customStartTime || filters.customEndTime) {
      result = result.filter((log) => {
        const logTime = new Date(log.timestamp).getTime()
        const start = filters.customStartTime?.getTime() || 0
        const end = filters.customEndTime?.getTime() || Date.now()
        return logTime >= start && logTime <= end
      })
    }

    // Filter by search text
    if (filters.searchText) {
      if (filters.regexEnabled) {
        try {
          const regex = new RegExp(filters.searchText, 'i')
          result = result.filter((log) => regex.test(log.line))
        } catch {
          // Invalid regex, fall back to plain text search
          const searchLower = filters.searchText.toLowerCase()
          result = result.filter((log) => log.line.toLowerCase().includes(searchLower))
        }
      } else {
        const searchLower = filters.searchText.toLowerCase()
        result = result.filter((log) => log.line.toLowerCase().includes(searchLower))
      }
    }

    return result
  }, [logs, selectedServices, filters])

  // Calculate insights
  const insights = useMemo((): LogInsights => {
    const errorCount = filteredLogs.filter((log) => log.level === 'error').length
    const warningCount = filteredLogs.filter((log) => log.level === 'warn').length

    // Find repeated error patterns
    const errorMessages = filteredLogs
      .filter((log) => log.level === 'error')
      .map((log) => log.line.slice(0, 100)) // First 100 chars

    const messageCounts = errorMessages.reduce(
      (acc, msg) => {
        acc[msg] = (acc[msg] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const patterns = Object.entries(messageCounts)
      .filter(([_, count]) => count > 1)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    return { errorCount, warningCount, patterns }
  }, [filteredLogs])

  // Actions
  const handleServiceChange = useCallback((newServices: string[]) => {
    setSelectedServices(newServices)

    // Update recent services
    setRecentServices((prev) => {
      const updated = [...new Set([...newServices, ...prev])]
      return updated.slice(0, 5)
    })
  }, [])

  const handleClearLogs = () => {
    if (confirm('Clear all logs from view? This will not affect actual service logs.')) {
      setLogs([])
      setBufferedLogs([])
    }
  }

  const handleDownloadLogs = () => {
    const logsToDownload = filteredLogs.slice(-1000)
    const content = logsToDownload
      .map((log) => `[${log.timestamp}] [${log.service}] [${log.level?.toUpperCase()}] ${log.line}`)
      .join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRefresh = () => {
    setLogs([])
    setBufferedLogs([])
  }

  const handleShare = async () => {
    const params = new URLSearchParams({
      services: selectedServices.join(','),
      level: filters.level,
      search: filters.searchText,
      range: filters.timeRange,
    })

    const url = `${window.location.origin}/logs?${params.toString()}`

    try {
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
    } catch {
      prompt('Copy this link:', url)
    }
  }

  // Load filters from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const servicesParam = params.get('services')
    const levelParam = params.get('level')
    const searchParam = params.get('search')
    const rangeParam = params.get('range')

    if (servicesParam) {
      setSelectedServices(servicesParam.split(','))
    }

    if (levelParam || searchParam || rangeParam) {
      setFilters((prev) => ({
        ...prev,
        level: (levelParam as LogFiltersType['level']) || prev.level,
        searchText: searchParam || prev.searchText,
        timeRange: (rangeParam as LogFiltersType['timeRange']) || prev.timeRange,
      }))
    }
  }, [])

  if (isLoading) {
    return (
      <>
        <h1 className="sr-only">Service Logs</h1>
        <HeroPattern />
        <LogViewerSkeleton />
      </>
    )
  }

  return (
    <>
      <HeroPattern />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">Service Logs</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Real-time log streaming from your services
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
              <div
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-green-500'
                    : connectionStatus === 'connecting'
                      ? 'animate-pulse bg-yellow-500'
                      : 'bg-red-500'
                }`}
              />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {connectionStatus === 'connected'
                  ? 'Connected'
                  : connectionStatus === 'connecting'
                    ? 'Connecting...'
                    : 'Disconnected'}
              </span>
            </div>

            <Button onClick={handleRefresh} variant="outline" className="px-3 py-2 text-sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleDownloadLogs} variant="outline" className="px-3 py-2 text-sm">
              <Download className="h-4 w-4" />
            </Button>
            <Button onClick={handleShare} variant="outline" className="px-3 py-2 text-sm">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button onClick={handleClearLogs} variant="outline" className="px-3 py-2 text-sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Service Selector */}
      <div className="mb-4">
        <ServiceSelector
          services={services}
          selectedServices={selectedServices}
          onChange={handleServiceChange}
          recentServices={recentServices}
        />
      </div>

      {/* Filters */}
      <div className="mb-4">
        <LogFilters
          filters={filters}
          onChange={setFilters}
          totalCount={logs.length}
          filteredCount={filteredLogs.length}
        />
      </div>

      {/* Insights */}
      {(insights.errorCount > 0 || insights.warningCount > 0 || insights.patterns.length > 0) && (
        <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center gap-6">
            {/* Error Count */}
            {insights.errorCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-xs text-zinc-500">Errors</div>
                  <div className="text-lg font-bold text-red-500">{insights.errorCount}</div>
                </div>
              </div>
            )}

            {/* Warning Count */}
            {insights.warningCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-xs text-zinc-500">Warnings</div>
                  <div className="text-lg font-bold text-yellow-500">{insights.warningCount}</div>
                </div>
              </div>
            )}

            {/* Patterns */}
            {insights.patterns.length > 0 && (
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-zinc-500" />
                  <div className="text-xs text-zinc-500">Repeated Errors</div>
                </div>
                <div className="space-y-1">
                  {insights.patterns.map((pattern, idx) => (
                    <div key={idx} className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                      <span className="font-semibold text-red-500">{pattern.count}x</span>{' '}
                      {pattern.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Stream */}
      <div className="h-[600px]">
        {connectionStatus === 'disconnected' ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Connection lost</p>
              <p className="mt-1 text-xs text-zinc-500">Reconnecting...</p>
            </div>
          </div>
        ) : (
          <LogStream
            logs={filteredLogs}
            autoScroll={autoScroll}
            maxLogs={MAX_LOGS}
            onAutoScrollChange={setAutoScroll}
          />
        )}
      </div>
    </>
  )
}

export default function LogsPage() {
  return (
    <Suspense
      fallback={
        <div>
          <h1 className="sr-only">Service Logs</h1>
          <LogViewerSkeleton />
        </div>
      }
    >
      <LogsContent />
    </Suspense>
  )
}
