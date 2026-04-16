'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { TableSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Clock,
  Download,
  Filter,
  RefreshCw,
  ScrollText,
  Terminal,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────

interface AuditEntry {
  timestamp: string
  action: string
  user: string
  details: string
  ip: string
  status: 'success' | 'failed' | 'warning'
}

// ── Constants ──────────────────────────────────────────────────

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'config.change', label: 'Config Change' },
  { value: 'deploy', label: 'Deploy' },
  { value: 'secret.access', label: 'Secret Access' },
  { value: 'role.change', label: 'Role Change' },
  { value: 'webhook.fire', label: 'Webhook Fire' },
]

const DATE_RANGES = [
  { value: '', label: 'All Time' },
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
]

const PAGE_SIZE = 50

// ── Helpers ────────────────────────────────────────────────────

function parseAuditOutput(output: string): AuditEntry[] {
  if (!output) return []

  const lines = output.split('\n').filter((line) => line.trim())
  const entries: AuditEntry[] = []

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line)
      entries.push({
        timestamp: parsed.timestamp || '',
        action: parsed.action || '',
        user: parsed.user || 'system',
        details: parsed.details || parsed.message || '',
        ip: parsed.ip || parsed.source_ip || '-',
        status: parsed.status || 'success',
      })
    } catch {
      // Try to parse as a structured text line
      // Format: TIMESTAMP | ACTION | USER | DETAILS | IP | STATUS
      const parts = line.split('|').map((p) => p.trim())
      if (parts.length >= 4) {
        entries.push({
          timestamp: parts[0] || '',
          action: parts[1] || '',
          user: parts[2] || 'system',
          details: parts[3] || '',
          ip: parts[4] || '-',
          status: (parts[5] as AuditEntry['status']) || 'success',
        })
      }
    }
  }

  return entries
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts)
    if (isNaN(date.getTime())) return ts
    return date.toLocaleString()
  } catch {
    return ts
  }
}

function StatusBadge({ status }: { status: AuditEntry['status'] }) {
  switch (status) {
    case 'success':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-3 w-3" />
          Success
        </span>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <XCircle className="h-3 w-3" />
          Failed
        </span>
      )
    case 'warning':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          Warning
        </span>
      )
  }
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    login: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    logout: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
    'config.change':
      'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400',
    deploy:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    'secret.access':
      'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    'role.change':
      'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
    'webhook.fire':
      'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400',
  }

  const colorClass =
    colors[action] ||
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {action}
    </span>
  )
}

// ── Component ──────────────────────────────────────────────────

function AuditLogContent() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [rawOutput, setRawOutput] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [actionFilter, setActionFilter] = useState('')
  const [dateRange, setDateRange] = useState('')
  const [userFilter, setUserFilter] = useState('')

  // Pagination
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // CLI preview
  const [showCLIOutput, setShowCLIOutput] = useState(false)

  // Export
  const [exporting, setExporting] = useState(false)

  const buildCliPreview = useCallback(() => {
    let cmd = 'nself audit'
    if (actionFilter) cmd += ` --action=${actionFilter}`
    if (dateRange) cmd += ` --since=${dateRange}`
    cmd += ` --limit=${displayCount}`
    return cmd
  }, [actionFilter, dateRange, displayCount])

  const fetchAuditLog = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (actionFilter) params.set('action', actionFilter)
      if (dateRange) params.set('since', dateRange)
      params.set('limit', String(displayCount))

      const queryString = params.toString()
      const url = `/api/audit${queryString ? `?${queryString}` : ''}`
      const response = await fetch(url)
      const json = await response.json()

      if (json.success && json.data) {
        setRawOutput(json.data.output || '')
        const parsed = parseAuditOutput(json.data.output || '')
        setEntries(parsed)
      } else {
        setError(json.error || json.details || 'Failed to load audit log')
      }
    } catch (_err) {
      setError('Failed to connect to audit API')
    } finally {
      setLoading(false)
    }
  }, [actionFilter, dateRange, displayCount])

  // Initial load
  useEffect(() => {
    fetchAuditLog()
  }, [fetchAuditLog])

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchAuditLog, 10000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh, fetchAuditLog])

  // Client-side user filter
  const filteredEntries = userFilter
    ? entries.filter((e) =>
        e.user.toLowerCase().includes(userFilter.toLowerCase()),
      )
    : entries

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true)
    try {
      const response = await fetch(`/api/audit/export?format=${format}`)
      const json = await response.json()

      if (json.success && json.data?.output) {
        const blob = new Blob([json.data.output], {
          type: format === 'json' ? 'application/json' : 'text/csv',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-log-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        setError(json.error || 'Export failed')
      }
    } catch (_err) {
      setError('Failed to export audit log')
    } finally {
      setExporting(false)
    }
  }

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + PAGE_SIZE)
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <ScrollText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-blue-400 dark:to-white">
                  Audit Log
                </h1>
              </div>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Track all system events, user actions, and security activity
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={fetchAuditLog}
                variant="primary"
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            {/* Action Type Filter */}
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <Filter className="mr-1 inline h-3 w-3" />
                Action Type
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
              >
                {ACTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <Clock className="mr-1 inline h-3 w-3" />
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
              >
                {DATE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* User Filter */}
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                User
              </label>
              <input
                type="text"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Filter by user..."
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:placeholder-zinc-500"
              />
            </div>

            {/* Auto-refresh Toggle */}
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
                />
                Auto-refresh
              </label>
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <div className="flex gap-1">
                <Button
                  onClick={() => handleExport('json')}
                  variant="secondary"
                  disabled={exporting}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  JSON
                </Button>
                <Button
                  onClick={() => handleExport('csv')}
                  variant="secondary"
                  disabled={exporting}
                >
                  CSV
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && !loading && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Audit Log Error
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && entries.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex flex-col items-center justify-center">
              <RefreshCw className="mb-4 h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Loading audit log...
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Executing nself audit
              </p>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {!loading && entries.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Showing {filteredEntries.length} of {entries.length} entries
              {autoRefresh && (
                <span className="ml-2 inline-flex items-center gap-1 text-blue-500">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Auto-refreshing
                </span>
              )}
            </p>
          </div>
        )}

        {/* Audit Table */}
        {!loading && filteredEntries.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80">
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                      Action
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                      User
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                      Details
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                      IP
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {filteredEntries.map((entry, index) => (
                    <tr
                      key={index}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/30"
                    >
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {formatTimestamp(entry.timestamp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ActionBadge action={entry.action} />
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-zinc-900 dark:text-white">
                        {entry.user}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {entry.details}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-zinc-500 dark:text-zinc-500">
                        {entry.ip}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={entry.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load More */}
            {filteredEntries.length >= displayCount && (
              <div className="border-t border-zinc-100 p-4 text-center dark:border-zinc-700">
                <Button onClick={handleLoadMore} variant="secondary">
                  <ChevronDown className="mr-1.5 h-4 w-4" />
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && entries.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-700">
                <ScrollText className="h-8 w-8 text-zinc-400" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
                No Audit Entries
              </h2>
              <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
                No audit log entries found for the current filters. Try
                adjusting the filters or check back later.
              </p>
            </div>
          </div>
        )}

        {/* CLI Command Preview */}
        <div className="mt-6">
          <button
            onClick={() => setShowCLIOutput(!showCLIOutput)}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            <Terminal className="h-4 w-4" />
            CLI Command Preview
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showCLIOutput ? 'rotate-180' : ''}`}
            />
          </button>

          {showCLIOutput && (
            <div className="mt-3 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <div className="border-b border-zinc-100 p-4 dark:border-zinc-700">
                <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Equivalent CLI command:
                </p>
                <pre className="rounded-lg bg-zinc-900 p-3 font-mono text-sm text-green-400">
                  $ {buildCliPreview()}
                </pre>
              </div>

              {rawOutput && (
                <div className="p-4">
                  <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Raw output:
                  </p>
                  <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-900 p-3 font-mono text-xs whitespace-pre-wrap text-zinc-300">
                    {rawOutput}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <AuditLogContent />
    </Suspense>
  )
}
