'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ChartSkeleton } from '@/components/skeletons'
import type { BenchmarkBaseline, BenchmarkResult } from '@/types/performance'
import {
  Activity,
  Clock,
  GitCompare,
  Play,
  Save,
  Target,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function BenchmarkContent() {
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<BenchmarkResult[]>([])
  const [baselines, setBaselines] = useState<BenchmarkBaseline[]>([])

  const fetchData = useCallback(async () => {
    try {
      // Mock data - replace with real API
      const mockResults: BenchmarkResult[] = [
        {
          id: '1',
          target: 'API - GraphQL',
          type: 'api',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          duration: 60000,
          requests: {
            total: 15000,
            successful: 14985,
            failed: 15,
            perSecond: 250,
          },
          latency: {
            min: 5,
            max: 450,
            avg: 45,
            p50: 38,
            p95: 120,
            p99: 250,
          },
          throughput: {
            bytesPerSecond: 2500000,
            requestsPerSecond: 250,
          },
        },
        {
          id: '2',
          target: 'Database - PostgreSQL',
          type: 'database',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          duration: 30000,
          requests: {
            total: 50000,
            successful: 49998,
            failed: 2,
            perSecond: 1666,
          },
          latency: {
            min: 0.5,
            max: 85,
            avg: 2.5,
            p50: 1.8,
            p95: 8,
            p99: 25,
          },
          throughput: {
            bytesPerSecond: 5000000,
            requestsPerSecond: 1666,
          },
        },
      ]

      const mockBaselines: BenchmarkBaseline[] = [
        {
          id: 'baseline-1',
          name: 'Production v1.2.0',
          createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          results: mockResults,
        },
        {
          id: 'baseline-2',
          name: 'Pre-optimization',
          createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
          results: mockResults.map((r) => ({
            ...r,
            latency: {
              ...r.latency,
              avg: r.latency.avg * 1.5,
              p95: r.latency.p95 * 1.5,
            },
          })),
        },
      ]

      setResults(mockResults)
      setBaselines(mockBaselines)
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const latencyData = results.map((r) => ({
    name: r.target.split(' - ')[1] || r.target,
    avg: r.latency.avg,
    p95: r.latency.p95,
    p99: r.latency.p99,
  }))

  const throughputData = results.map((r) => ({
    name: r.target.split(' - ')[1] || r.target,
    rps: r.throughput.requestsPerSecond,
  }))

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

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-sky-400 dark:to-pink-300">
                Benchmarks
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Performance testing and baseline comparison
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/benchmark/baseline"
                className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Save className="h-4 w-4" />
                Baselines
              </Link>
              <Link
                href="/benchmark/run"
                className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600"
              >
                <Play className="h-4 w-4" />
                Run Benchmark
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <Activity className="h-5 w-5 text-sky-500 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Requests
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {results
                    .reduce((acc, r) => acc + r.requests.total, 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Avg Latency
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {(
                    results.reduce((acc, r) => acc + r.latency.avg, 0) /
                      results.length || 0
                  ).toFixed(1)}
                  ms
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Throughput
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {results
                    .reduce((acc, r) => acc + r.throughput.requestsPerSecond, 0)
                    .toLocaleString()}{' '}
                  req/s
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Success Rate
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {(
                    (results.reduce(
                      (acc, r) => acc + r.requests.successful,
                      0,
                    ) /
                      results.reduce((acc, r) => acc + r.requests.total, 0)) *
                      100 || 0
                  ).toFixed(2)}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Latency Distribution (ms)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="avg" name="Average" fill="#8b5cf6" />
                <Bar dataKey="p95" name="P95" fill="#ec4899" />
                <Bar dataKey="p99" name="P99" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Throughput (req/s)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="rps" name="Requests/sec" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Results */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Recent Benchmark Results
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Target
                  </th>
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Type
                  </th>
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Requests
                  </th>
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Avg Latency
                  </th>
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    P95
                  </th>
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Throughput
                  </th>
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr
                    key={result.id}
                    className="border-b border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="py-3 font-medium text-zinc-900 dark:text-white">
                      {result.target}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
                          result.type === 'api'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : result.type === 'database'
                              ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
                              : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
                        }`}
                      >
                        {result.type}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {result.requests.total.toLocaleString()}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {result.latency.avg.toFixed(1)}ms
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {result.latency.p95.toFixed(1)}ms
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {result.throughput.requestsPerSecond.toLocaleString()}{' '}
                      req/s
                    </td>
                    <td className="py-3 text-zinc-500 dark:text-zinc-400">
                      {new Date(result.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Baselines */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Saved Baselines
            </h3>
            <Link
              href="/benchmark/compare"
              className="flex items-center gap-2 text-sm text-sky-500 hover:underline dark:text-sky-400"
            >
              <GitCompare className="h-4 w-4" />
              Compare Baselines
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {baselines.map((baseline) => (
              <div
                key={baseline.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-medium text-zinc-900 dark:text-white">
                    {baseline.name}
                  </h4>
                  <span className="text-sm text-zinc-500">
                    {new Date(baseline.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {baseline.results.length} benchmark results
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/benchmark/run"
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-sky-500 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-sky-500 dark:hover:bg-sky-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <Play className="h-5 w-5 text-sky-500 dark:text-sky-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">
                Run Benchmark
              </p>
              <p className="text-sm text-zinc-500">Start a new test</p>
            </div>
          </Link>

          <Link
            href="/benchmark/baseline"
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-sky-500 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-sky-500 dark:hover:bg-sky-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Save className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">
                Manage Baselines
              </p>
              <p className="text-sm text-zinc-500">
                Save and manage benchmarks
              </p>
            </div>
          </Link>

          <Link
            href="/benchmark/compare"
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-sky-500 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-sky-500 dark:hover:bg-sky-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <GitCompare className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">
                Compare Results
              </p>
              <p className="text-sm text-zinc-500">
                Analyze performance changes
              </p>
            </div>
          </Link>
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself bench</span> - Run default
              benchmark suite
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself bench --target=api</span>{' '}
              - Benchmark specific target
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself bench --save=name</span> -
              Save as baseline
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself bench --compare=baseline
              </span>{' '}
              - Compare with baseline
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function BenchmarkPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <BenchmarkContent />
    </Suspense>
  )
}
