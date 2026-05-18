'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ChartSkeleton } from '@/components/skeletons'
import { Activity, ArrowLeft, Play, RefreshCw, Search } from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface MetricSeries {
  metric: string
  labels: Record<string, string>
  values: { time: string; value: number }[]
}

function MetricsContent() {
  const [loading, setLoading] = useState(true)
  const [queryLoading, setQueryLoading] = useState(false)
  const [query, setQuery] = useState('http_requests_total')
  const [timeRange, setTimeRange] = useState('1h')
  const [results, setResults] = useState<MetricSeries[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savedQueries, _setSavedQueries] = useState<string[]>([
    'http_requests_total',
    'process_cpu_seconds_total',
    'process_resident_memory_bytes',
    'http_request_duration_seconds_bucket',
    'pg_stat_database_tup_fetched',
  ])

  const fetchMetrics = useCallback(async () => {
    setQueryLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/monitor/metrics?query=${encodeURIComponent(query)}&range=${timeRange}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
      setResults([])
    } finally {
      setQueryLoading(false)
      setLoading(false)
    }
  }, [query, timeRange])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const executeQuery = () => {
    fetchMetrics()
  }

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={fetchMetrics}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <Link
            href="/monitor"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Monitor
          </Link>
          <h1 className="bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent dark:from-blue-400 dark:to-cyan-300">
            Metrics Explorer
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Query and visualize Prometheus metrics
          </p>
        </div>

        {/* Query Input */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-4 flex gap-4">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                PromQL Query
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter PromQL query..."
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2 pr-4 pl-10 font-mono text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              >
                <option value="15m">Last 15 minutes</option>
                <option value="1h">Last 1 hour</option>
                <option value="3h">Last 3 hours</option>
                <option value="6h">Last 6 hours</option>
                <option value="12h">Last 12 hours</option>
                <option value="24h">Last 24 hours</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={executeQuery}
                disabled={queryLoading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {queryLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Execute
              </button>
            </div>
          </div>

          {/* Saved Queries */}
          <div>
            <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">Common queries:</p>
            <div className="flex flex-wrap gap-2">
              {savedQueries.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className={`rounded-lg px-3 py-1 font-mono text-sm transition-colors ${
                    query === q
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
                <Activity className="h-5 w-5" />
                Query Results
              </h3>
              <span className="text-sm text-zinc-500">{results.length} series</span>
            </div>

            {/* Chart */}
            <div className="mb-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} allowDuplicatedCategory={false} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  {results.map((series, idx) => (
                    <Line
                      key={`${series.metric}-${idx}`}
                      data={series.values}
                      type="monotone"
                      dataKey="value"
                      name={`${series.labels.instance || series.metric}`}
                      stroke={colors[idx % colors.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Series Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="py-2 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Metric
                    </th>
                    <th className="py-2 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Labels
                    </th>
                    <th className="py-2 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Latest Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((series, idx) => (
                    <tr
                      key={`${series.metric}-${idx}`}
                      className="border-b border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: colors[idx % colors.length],
                            }}
                          />
                          <span className="font-mono text-sm text-zinc-900 dark:text-white">
                            {series.metric}
                          </span>
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(series.labels).map(([k, v]) => (
                            <span
                              key={k}
                              className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                            >
                              {k}={v}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono text-sm text-zinc-900 dark:text-white">
                        {series.values[series.values.length - 1]?.value.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CLI Reference */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself metrics</span> - List available metrics
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">
                nself metrics query &quot;http_requests_total&quot;
              </span>{' '}
              - Query metrics
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself metrics --range=1h</span> - Set time range
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function MetricsPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <MetricsContent />
    </Suspense>
  )
}
