'use client'

import { ChartSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Chart } from '@/components/ui/chart'
import { EmptyState } from '@/components/ui/empty-state'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, BarChart3, Copy, Download, PlayCircle, RefreshCw } from 'lucide-react'
import { Suspense, useState } from 'react'

interface MetricData extends Record<string, unknown> {
  timestamp: string
  value: number
}

function PrometheusContent() {
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedMetric, setSelectedMetric] = useState<string>('')
  const [timeRange, setTimeRange] = useState('1h')
  const [results, setResults] = useState<MetricData[]>([])
  const [error, setError] = useState<string | null>(null)

  const commonMetrics = [
    { value: 'cpu_usage', label: 'CPU Usage', query: 'rate(cpu_usage[5m])' },
    {
      value: 'memory_usage',
      label: 'Memory Usage',
      query: 'memory_usage_bytes',
    },
    { value: 'disk_io', label: 'Disk I/O', query: 'rate(disk_io_bytes[5m])' },
    {
      value: 'network_io',
      label: 'Network I/O',
      query: 'rate(network_io_bytes[5m])',
    },
    {
      value: 'http_requests',
      label: 'HTTP Requests',
      query: 'rate(http_requests_total[5m])',
    },
    {
      value: 'error_rate',
      label: 'Error Rate',
      query: 'rate(http_errors_total[5m])',
    },
  ]

  const handleMetricSelect = (value: string) => {
    setSelectedMetric(value)
    const metric = commonMetrics.find((m) => m.value === value)
    if (metric) {
      setQuery(metric.query)
    }
  }

  const handleExecuteQuery = async () => {
    if (!query) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/monitor/prometheus/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, range: timeRange }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Query failed')
      }

      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute query')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      const csv = ['timestamp,value', ...results.map((r) => `${r.timestamp},${r.value}`)].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'prometheus-metrics.csv'
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const json = JSON.stringify(results, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'prometheus-metrics.json'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(query)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Prometheus Metrics</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Query and visualize Prometheus metrics with PromQL
        </p>
      </div>

      {/* Query Builder */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Query Builder</h2>

        <div className="space-y-4">
          {/* Metric Selector */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="metric">Common Metrics</Label>
              <Select value={selectedMetric} onValueChange={handleMetricSelect}>
                <SelectTrigger id="metric">
                  <SelectValue placeholder="Select a metric..." />
                </SelectTrigger>
                <SelectContent>
                  {commonMetrics.map((metric) => (
                    <SelectItem key={metric.value} value={metric.value}>
                      {metric.label}
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
                  <SelectItem value="7d">Last 7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Query */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="query">PromQL Query</Label>
              <Button variant="ghost" size="sm" onClick={handleCopyQuery} disabled={!query}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
            <Textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter PromQL query (e.g., rate(http_requests_total[5m]))"
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
            {results.length > 0 && (
              <>
                <Button variant="outline" onClick={() => handleExport('csv')} disabled={loading}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => handleExport('json')} disabled={loading}>
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </Button>
              </>
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
          <Skeleton className="h-[300px] w-full" />
        </Card>
      ) : results.length > 0 ? (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Results</h2>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {results.length} data points
            </span>
          </div>

          <Chart
            type="line"
            data={results as Array<Record<string, unknown>>}
            dataKey="value"
            xAxisKey="timestamp"
            height={300}
            color="#3b82f6"
          />

          {/* Data Table */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-white">Raw Data</h3>
            <div className="max-h-96 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-zinc-900 dark:text-white">
                      Timestamp
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-zinc-900 dark:text-white">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {results.map((result, index) => (
                    <tr key={index} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="px-4 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                        {result.timestamp}
                      </td>
                      <td className="px-4 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                        {result.value.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      ) : (
        !error && (
          <EmptyState
            icon={BarChart3}
            title="No Results"
            description="Execute a query to see metrics visualization and data"
          />
        )
      )}
    </div>
  )
}

export default function PrometheusPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <PrometheusContent />
    </Suspense>
  )
}
