'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { ChartSkeleton } from '@/components/skeletons'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface PerformanceMetrics {
  responseTime: {
    p50: number
    p95: number
    p99: number
    average: number
  }
  throughput: {
    requestsPerSecond: number
    totalRequests: number
    successRate: number
  }
  errorRate: {
    percentage: number
    total: number
    byType: Record<string, number>
  }
  endpoints: EndpointPerformance[]
  database: DatabasePerformance
  cache: CachePerformance
  optimization: OptimizationSuggestion[]
}

interface EndpointPerformance {
  path: string
  method: string
  avgResponseTime: number
  requestCount: number
  errorRate: number
  p95: number
}

interface DatabasePerformance {
  slowQueries: SlowQuery[]
  avgQueryTime: number
  queryCount: number
  connectionPoolUsage: number
}

interface SlowQuery {
  query: string
  avgTime: number
  count: number
  timestamp: string
}

interface CachePerformance {
  hitRate: number
  missRate: number
  totalRequests: number
  evictionRate: number
}

interface OptimizationSuggestion {
  id: string
  severity: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  impact: string
  action: string
}

function MetricCard({
  title,
  value,
  unit,
  change,
  trend,
  icon: Icon,
  color = 'blue',
}: {
  title: string
  value: string | number
  unit?: string
  change?: number
  trend?: 'up' | 'down' | 'stable'
  icon: any
  color?: 'blue' | 'green' | 'red' | 'yellow'
}) {
  const colorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    red: 'text-red-500',
    yellow: 'text-yellow-500',
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Icon className={`h-5 w-5 ${colorClasses[color]}`} />
            <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</h3>
          </div>

          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</span>
            {unit && <span className="text-sm text-zinc-500">{unit}</span>}
          </div>

          {change !== undefined && (
            <div
              className={`flex items-center gap-1 text-xs ${
                change > 0
                  ? 'text-green-600 dark:text-green-400'
                  : change < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-zinc-500'
              }`}
            >
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(change)}% from last hour</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResponseTimeChart({ data }: { data: { p50: number; p95: number; p99: number } }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Response Time Distribution
        </h3>
        <Button variant="outline" className="text-xs">
          <Download className="mr-1 h-3 w-3" />
          Export
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">P50</span>
            <span className="font-medium">{data.p50}ms</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full bg-green-500"
              style={{ width: `${(data.p50 / data.p99) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">P95</span>
            <span className="font-medium">{data.p95}ms</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full bg-yellow-500"
              style={{ width: `${(data.p95 / data.p99) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">P99</span>
            <span className="font-medium">{data.p99}ms</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div className="h-full bg-red-500" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          <strong>P50:</strong> 50% of requests are faster than this
          <br />
          <strong>P95:</strong> 95% of requests are faster than this
          <br />
          <strong>P99:</strong> 99% of requests are faster than this
        </p>
      </div>
    </div>
  )
}

function EndpointPerformanceTable({ endpoints }: { endpoints: EndpointPerformance[] }) {
  const [sortBy, setSortBy] = useState<'path' | 'avgResponseTime' | 'requestCount' | 'errorRate'>(
    'avgResponseTime'
  )
  const [sortDesc, setSortDesc] = useState(true)

  const sortedEndpoints = [...endpoints].sort((a, b) => {
    const multiplier = sortDesc ? -1 : 1
    return multiplier * (a[sortBy] > b[sortBy] ? 1 : -1)
  })

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDesc(!sortDesc)
    } else {
      setSortBy(field)
      setSortDesc(true)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 p-6 dark:border-zinc-700">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Endpoint Performance
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                <button
                  onClick={() => toggleSort('path')}
                  className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Endpoint
                  {sortBy === 'path' && (sortDesc ? '↓' : '↑')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Method
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                <button
                  onClick={() => toggleSort('avgResponseTime')}
                  className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Avg Response
                  {sortBy === 'avgResponseTime' && (sortDesc ? '↓' : '↑')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                P95
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                <button
                  onClick={() => toggleSort('requestCount')}
                  className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Requests
                  {sortBy === 'requestCount' && (sortDesc ? '↓' : '↑')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                <button
                  onClick={() => toggleSort('errorRate')}
                  className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Error Rate
                  {sortBy === 'errorRate' && (sortDesc ? '↓' : '↑')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {sortedEndpoints.map((endpoint, index) => (
              <tr key={index} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-3 font-mono text-sm text-zinc-900 dark:text-white">
                  {endpoint.path}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      endpoint.method === 'GET'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : endpoint.method === 'POST'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : endpoint.method === 'PUT'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    {endpoint.method}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {endpoint.avgResponseTime}ms
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {endpoint.p95}ms
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {endpoint.requestCount.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-sm font-medium ${
                      endpoint.errorRate > 5
                        ? 'text-red-600'
                        : endpoint.errorRate > 1
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}
                  >
                    {endpoint.errorRate.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SlowQueriesPanel({ queries }: { queries: SlowQuery[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
        Slow Database Queries
      </h3>

      <div className="space-y-3">
        {queries.map((query, index) => (
          <div key={index} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-1 font-mono text-sm text-zinc-900 dark:text-white">
                  {query.query}
                </div>
                <div className="text-xs text-zinc-500">Executed {query.count} times</div>
              </div>
              <div className="ml-4 text-right">
                <div className="text-sm font-medium text-red-600">{query.avgTime}ms</div>
                <div className="text-xs text-zinc-500">avg time</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OptimizationSuggestions({ suggestions }: { suggestions: OptimizationSuggestion[] }) {
  const severityColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
        Optimization Suggestions
      </h3>

      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${severityColors[suggestion.severity]}`}
                  >
                    {suggestion.severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-zinc-500">{suggestion.category}</span>
                </div>
                <h4 className="mb-1 font-medium text-zinc-900 dark:text-white">
                  {suggestion.title}
                </h4>
                <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {suggestion.description}
                </p>
                <div className="mb-2 text-sm">
                  <strong className="text-zinc-700 dark:text-zinc-300">Impact:</strong>{' '}
                  <span className="text-zinc-600 dark:text-zinc-400">{suggestion.impact}</span>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full text-sm">
              {suggestion.action}
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SystemPerformanceContent() {
  const [autoRefresh, setAutoRefresh] = useState(true)

  const { data, error, isLoading, mutate } = useSWR<PerformanceMetrics | null>(
    '/api/system/performance',
    fetcher,
    { refreshInterval: autoRefresh ? 30000 : 0 }
  )

  const metrics = data ?? null

  if (error) {
    return (
      <>
        <HeroPattern />
        <div className="mx-auto max-w-7xl">
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
              Unable to load performance metrics
            </h2>
            <Button onClick={() => mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <HeroPattern />
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-zinc-600 dark:text-zinc-400">
              Loading performance metrics...
            </span>
          </div>
        </div>
      </>
    )
  }

  if (!metrics) {
    return (
      <>
        <HeroPattern />
        <div className="mx-auto max-w-7xl">
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
              No performance metrics available
            </h2>
            <Button onClick={() => mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-zinc-900 dark:text-white">
                <Zap className="h-8 w-8 text-blue-500" />
                Performance Metrics
              </h1>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Monitor application performance and optimize bottlenecks
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh
              </label>
              <Button variant="outline" onClick={() => mutate()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Avg Response Time"
              value={metrics.responseTime.average}
              unit="ms"
              change={-12.5}
              trend="down"
              icon={Clock}
              color="blue"
            />
            <MetricCard
              title="Throughput"
              value={metrics.throughput.requestsPerSecond}
              unit="req/s"
              change={8.3}
              trend="up"
              icon={Activity}
              color="green"
            />
            <MetricCard
              title="Success Rate"
              value={metrics.throughput.successRate.toFixed(1)}
              unit="%"
              change={0.2}
              trend="up"
              icon={CheckCircle2}
              color="green"
            />
            <MetricCard
              title="Error Rate"
              value={metrics.errorRate.percentage.toFixed(2)}
              unit="%"
              change={-0.5}
              trend="down"
              icon={AlertCircle}
              color={
                metrics.errorRate.percentage > 5
                  ? 'red'
                  : metrics.errorRate.percentage > 1
                    ? 'yellow'
                    : 'green'
              }
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ResponseTimeChart data={metrics.responseTime} />

            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Cache Performance
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Hit Rate</span>
                    <span className="text-sm font-medium">{metrics.cache.hitRate}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${metrics.cache.hitRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Miss Rate</span>
                    <span className="text-sm font-medium">{metrics.cache.missRate}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${metrics.cache.missRate}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <p className="text-xs text-zinc-500">Total Requests</p>
                    <p className="text-lg font-semibold">
                      {metrics.cache.totalRequests.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Eviction Rate</p>
                    <p className="text-lg font-semibold">{metrics.cache.evictionRate}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <EndpointPerformanceTable endpoints={metrics.endpoints} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SlowQueriesPanel queries={metrics.database.slowQueries} />
            <OptimizationSuggestions suggestions={metrics.optimization} />
          </div>
        </div>
      </div>
    </>
  )
}

export default function SystemPerformancePage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <SystemPerformanceContent />
    </Suspense>
  )
}
