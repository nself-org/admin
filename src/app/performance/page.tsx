'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ChartSkeleton } from '@/components/skeletons'
import type { ServiceProfile, SystemProfile } from '@/types/performance'
import {
  Activity,
  Clock,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Network,
  Play,
  RefreshCw,
  TrendingUp,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface MetricData {
  timestamp: string
  cpu: number
  memory: number
  disk: number
  network: number
}

function PerformanceContent() {
  const [loading, setLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [systemProfile, setSystemProfile] = useState<SystemProfile | null>(null)
  const [services, setServices] = useState<ServiceProfile[]>([])
  const [metricsHistory, setMetricsHistory] = useState<MetricData[]>([])

  const fetchPerformanceData = useCallback(async () => {
    try {
      // Generate mock data for now - replace with real API
      const now = Date.now()
      const points = 20

      const mockMetrics = Array.from({ length: points }, (_, i) => ({
        timestamp: new Date(now - (points - i) * 60000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        cpu: Math.random() * 30 + 25,
        memory: Math.random() * 15 + 55,
        disk: Math.random() * 10 + 30,
        network: Math.random() * 50 + 20,
      }))

      setMetricsHistory(mockMetrics)

      setSystemProfile({
        cpu: {
          usage: Math.random() * 30 + 25,
          cores: 8,
          loadAvg: [1.2, 1.5, 1.8],
        },
        memory: {
          total: 16384,
          used: 10240,
          free: 6144,
          percentage: 62.5,
        },
        disk: {
          total: 512000,
          used: 180000,
          free: 332000,
          percentage: 35.2,
        },
        network: {
          bytesIn: 1024000,
          bytesOut: 512000,
          packetsIn: 10000,
          packetsOut: 8000,
        },
      })

      setServices([
        {
          name: 'PostgreSQL',
          cpu: 8.5,
          memory: { used: 512, limit: 2048, percentage: 25 },
          responseTime: { avg: 2.3, p50: 1.8, p95: 5.2, p99: 12.1 },
          requestsPerSecond: 150,
          errorRate: 0.01,
        },
        {
          name: 'Hasura',
          cpu: 15.2,
          memory: { used: 768, limit: 2048, percentage: 37.5 },
          responseTime: { avg: 45, p50: 32, p95: 120, p99: 250 },
          requestsPerSecond: 85,
          errorRate: 0.02,
        },
        {
          name: 'Auth Service',
          cpu: 5.1,
          memory: { used: 256, limit: 1024, percentage: 25 },
          responseTime: { avg: 25, p50: 18, p95: 65, p99: 150 },
          requestsPerSecond: 45,
          errorRate: 0.005,
        },
        {
          name: 'Redis',
          cpu: 2.3,
          memory: { used: 128, limit: 512, percentage: 25 },
          responseTime: { avg: 0.5, p50: 0.3, p95: 1.2, p99: 2.5 },
          requestsPerSecond: 500,
          errorRate: 0,
        },
      ])
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPerformanceData()

    if (autoRefresh) {
      const interval = setInterval(fetchPerformanceData, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, fetchPerformanceData])

  const runProfile = async () => {
    setIsRunning(true)
    try {
      await fetch('/api/performance/profile', { method: 'POST' })
      await fetchPerformanceData()
    } finally {
      setIsRunning(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} GB`
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} MB`
    return `${bytes} B`
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
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
              <h1 className="bg-gradient-to-r from-emerald-600 to-teal-400 bg-clip-text text-4xl font-bold text-transparent dark:from-emerald-400 dark:to-teal-300">
                Performance
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                System performance monitoring and resource utilization
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  autoRefresh
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                <RefreshCw
                  className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`}
                />
                {autoRefresh ? 'Auto' : 'Manual'}
              </button>
              <button
                onClick={runProfile}
                disabled={isRunning}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {isRunning ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run Profile
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  CPU Usage
                </p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {systemProfile?.cpu.usage.toFixed(1)}%
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Cpu className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${Math.min(systemProfile?.cpu.usage || 0, 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Memory
                </p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {systemProfile?.memory.percentage.toFixed(1)}%
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <MemoryStick className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{
                  width: `${Math.min(systemProfile?.memory.percentage || 0, 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Disk</p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {systemProfile?.disk.percentage.toFixed(1)}%
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <HardDrive className="h-6 w-6 text-sky-500 dark:text-sky-400" />
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-2 rounded-full bg-sky-500 transition-all"
                style={{
                  width: `${Math.min(systemProfile?.disk.percentage || 0, 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Network I/O
                </p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {formatBytes(systemProfile?.network.bytesIn || 0)}/s
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Network className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              Out: {formatBytes(systemProfile?.network.bytesOut || 0)}/s
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              CPU & Memory Trend
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={metricsHistory}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  name="CPU %"
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                  name="Memory %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Disk & Network I/O
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={metricsHistory}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="disk"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.2}
                  name="Disk %"
                />
                <Area
                  type="monotone"
                  dataKey="network"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.2}
                  name="Network MB/s"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Performance */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Service Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Service
                  </th>
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    CPU
                  </th>
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Memory
                  </th>
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Avg Latency
                  </th>
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    P95 Latency
                  </th>
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Req/s
                  </th>
                  <th className="py-3 text-left text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Error Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr
                    key={service.name}
                    className="border-b border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="py-3 font-medium text-zinc-900 dark:text-white">
                      {service.name}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {service.cpu.toFixed(1)}%
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {service.memory.used}MB / {service.memory.limit}MB
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {service.responseTime?.avg.toFixed(1)}ms
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {service.responseTime?.p95.toFixed(1)}ms
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {service.requestsPerSecond}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          (service.errorRate || 0) > 0.05
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : (service.errorRate || 0) > 0.01
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        {((service.errorRate || 0) * 100).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/performance/profile"
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-500 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">
                Full Profile
              </p>
              <p className="text-sm text-zinc-500">Detailed system analysis</p>
            </div>
          </Link>

          <Link
            href="/performance/queries"
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-500 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">
                Slow Queries
              </p>
              <p className="text-sm text-zinc-500">
                Query performance analysis
              </p>
            </div>
          </Link>

          <Link
            href="/performance/suggest"
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-500 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">
                Suggestions
              </p>
              <p className="text-sm text-zinc-500">
                Optimization recommendations
              </p>
            </div>
          </Link>

          <Link
            href="/benchmark"
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-500 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <TrendingUp className="h-5 w-5 text-sky-500 dark:text-sky-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">
                Benchmarks
              </p>
              <p className="text-sm text-zinc-500">Performance testing</p>
            </div>
          </Link>
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
            <Clock className="h-5 w-5" />
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-emerald-500">nself perf</span> - Show system
              performance overview
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-emerald-500">nself perf profile</span> - Run
              full system profile
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-emerald-500">nself perf queries</span> -
              Analyze slow queries
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-emerald-500">nself perf suggest</span> - Get
              optimization suggestions
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function PerformancePage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <PerformanceContent />
    </Suspense>
  )
}
