'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ChartSkeleton } from '@/components/skeletons'
import type {
  BenchmarkBaseline,
  BenchmarkComparison,
} from '@/types/performance'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  GitCompare,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function CompareContent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [baselines, setBaselines] = useState<BenchmarkBaseline[]>([])
  const [selectedBaseline, setSelectedBaseline] = useState<string>('')
  const [selectedCurrent, setSelectedCurrent] = useState<string>('')
  const [comparison, setComparison] = useState<BenchmarkComparison | null>(null)

  const fetchBaselines = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/benchmark/baseline')
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Failed to load baselines')
      }
      // API returns a single baseline or null; present as array for the dropdowns
      const arr: BenchmarkBaseline[] = data.data ? [data.data] : []
      setBaselines(arr)
      // Auto-select the single baseline in both slots so comparison is immediately visible
      if (arr.length >= 1) {
        setSelectedBaseline(arr[0].id)
        setSelectedCurrent(arr[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load baselines')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBaselines()
  }, [fetchBaselines])

  useEffect(() => {
    if (selectedBaseline && selectedCurrent) {
      const baseline = baselines.find((b) => b.id === selectedBaseline)
      const current = baselines.find((b) => b.id === selectedCurrent)

      if (baseline?.results[0] && current?.results[0]) {
        const baselineResult = baseline.results[0]
        const currentResult = current.results[0]

        const calcChange = (
          metric: string,
          baseVal: number,
          currVal: number,
          lowerIsBetter: boolean,
        ) => {
          const change = currVal - baseVal
          const changePercentage = (change / baseVal) * 100
          return {
            metric,
            baseline: baseVal,
            current: currVal,
            change,
            changePercentage,
            improved: lowerIsBetter ? change < 0 : change > 0,
          }
        }

        setComparison({
          baseline: baselineResult,
          current: currentResult,
          changes: [
            calcChange(
              'Average Latency (ms)',
              baselineResult.latency.avg,
              currentResult.latency.avg,
              true,
            ),
            calcChange(
              'P95 Latency (ms)',
              baselineResult.latency.p95,
              currentResult.latency.p95,
              true,
            ),
            calcChange(
              'P99 Latency (ms)',
              baselineResult.latency.p99,
              currentResult.latency.p99,
              true,
            ),
            calcChange(
              'Throughput (req/s)',
              baselineResult.throughput.requestsPerSecond,
              currentResult.throughput.requestsPerSecond,
              false,
            ),
            calcChange(
              'Total Requests',
              baselineResult.requests.total,
              currentResult.requests.total,
              false,
            ),
            calcChange(
              'Error Rate (%)',
              (baselineResult.requests.failed / baselineResult.requests.total) *
                100,
              (currentResult.requests.failed / currentResult.requests.total) *
                100,
              true,
            ),
          ],
        })
      }
    }
  }, [selectedBaseline, selectedCurrent, baselines])

  const chartData = comparison
    ? [
        {
          name: 'Avg Latency',
          Baseline: comparison.baseline.latency.avg,
          Current: comparison.current.latency.avg,
        },
        {
          name: 'P95 Latency',
          Baseline: comparison.baseline.latency.p95,
          Current: comparison.current.latency.p95,
        },
        {
          name: 'P99 Latency',
          Baseline: comparison.baseline.latency.p99,
          Current: comparison.current.latency.p99,
        },
      ]
    : []

  const throughputData = comparison
    ? [
        {
          name: 'Throughput',
          Baseline: comparison.baseline.throughput.requestsPerSecond,
          Current: comparison.current.throughput.requestsPerSecond,
        },
      ]
    : []

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
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
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
            <p className="mb-4 text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={fetchBaselines}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
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
            href="/benchmark"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Benchmarks
          </Link>
          <h1 className="bg-gradient-to-r from-green-600 to-emerald-400 bg-clip-text text-4xl font-bold text-transparent dark:from-green-400 dark:to-emerald-300">
            Benchmark Comparison
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Compare benchmark results to track performance changes
          </p>
        </div>

        {/* Selection */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Baseline (Before)
            </label>
            <select
              value={selectedBaseline}
              onChange={(e) => setSelectedBaseline(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-green-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Select baseline...</option>
              {baselines.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({new Date(b.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Compare With (After)
            </label>
            <select
              value={selectedCurrent}
              onChange={(e) => setSelectedCurrent(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-green-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Select benchmark...</option>
              {baselines.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({new Date(b.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {comparison && (
          <>
            {/* Summary */}
            <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
                <GitCompare className="h-5 w-5" />
                Comparison Summary
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {comparison.changes.slice(0, 6).map((change) => (
                  <div
                    key={change.metric}
                    className={`rounded-lg p-4 ${
                      change.improved
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : change.changePercentage === 0
                          ? 'bg-zinc-50 dark:bg-zinc-900'
                          : 'bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <p className="mb-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {change.metric}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-bold text-zinc-900 dark:text-white">
                        {change.current.toFixed(
                          change.metric.includes('%') ? 3 : 1,
                        )}
                      </p>
                      <div
                        className={`flex items-center gap-1 text-sm font-medium ${
                          change.improved
                            ? 'text-green-600 dark:text-green-400'
                            : change.changePercentage === 0
                              ? 'text-zinc-500'
                              : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {change.changePercentage > 0 ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : change.changePercentage < 0 ? (
                          <ArrowDown className="h-4 w-4" />
                        ) : (
                          <Minus className="h-4 w-4" />
                        )}
                        {Math.abs(change.changePercentage).toFixed(1)}%
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      Baseline: {change.baseline.toFixed(1)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts */}
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                  Latency Comparison (ms)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Baseline" fill="#f97316" />
                    <Bar dataKey="Current" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                  Throughput Comparison (req/s)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={throughputData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Baseline" fill="#f97316" />
                    <Bar dataKey="Current" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Changes */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Detailed Comparison
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Metric
                      </th>
                      <th className="py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Baseline
                      </th>
                      <th className="py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Current
                      </th>
                      <th className="py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Change
                      </th>
                      <th className="py-3 text-right text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.changes.map((change) => (
                      <tr
                        key={change.metric}
                        className="border-b border-zinc-100 dark:border-zinc-800"
                      >
                        <td className="py-3 font-medium text-zinc-900 dark:text-white">
                          {change.metric}
                        </td>
                        <td className="py-3 text-right text-zinc-600 dark:text-zinc-400">
                          {change.baseline.toFixed(
                            change.metric.includes('%') ? 3 : 1,
                          )}
                        </td>
                        <td className="py-3 text-right text-zinc-600 dark:text-zinc-400">
                          {change.current.toFixed(
                            change.metric.includes('%') ? 3 : 1,
                          )}
                        </td>
                        <td
                          className={`py-3 text-right font-medium ${
                            change.improved
                              ? 'text-green-600 dark:text-green-400'
                              : change.changePercentage === 0
                                ? 'text-zinc-500'
                                : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {change.changePercentage > 0 ? '+' : ''}
                          {change.changePercentage.toFixed(1)}%
                        </td>
                        <td className="py-3 text-right">
                          {change.improved ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <TrendingUp className="h-3 w-3" />
                              Improved
                            </span>
                          ) : change.changePercentage === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                              <Minus className="h-3 w-3" />
                              No Change
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              <TrendingDown className="h-3 w-3" />
                              Regressed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!comparison && selectedBaseline && selectedCurrent && (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <RefreshCw className="mx-auto mb-4 h-12 w-12 animate-spin text-zinc-400" />
            <p className="text-zinc-600 dark:text-zinc-400">
              Calculating comparison...
            </p>
          </div>
        )}

        {!comparison && (!selectedBaseline || !selectedCurrent) && (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <GitCompare className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              Select Benchmarks to Compare
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Choose a baseline and a benchmark to compare above.
            </p>
          </div>
        )}

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-green-500">
                nself bench --compare=baseline-name
              </span>{' '}
              - Compare with baseline
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-green-500">
                nself bench compare baseline1 baseline2
              </span>{' '}
              - Compare two baselines
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-green-500">nself bench compare --json</span>{' '}
              - Output comparison as JSON
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <CompareContent />
    </Suspense>
  )
}
