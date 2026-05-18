'use client'

import { Button } from '@/components/Button'
import { ChartSkeleton } from '@/components/skeletons'
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface Metric {
  name: string
  value: number
  unit: string
  change?: number
  trend?: 'up' | 'down' | 'stable'
  history?: number[]
}

interface MetricsData {
  cpu: Metric
  memory: Metric
  disk: Metric
  requests: Metric
  latency: Metric
  errors: Metric
  uptime: Metric
  connections: Metric
  custom?: Metric[]
  collectedAt: string
}

function trendColor(trend: Metric['trend'], name: string) {
  // For error/latency metrics, up = bad; for others, up = good
  const inverseMetrics = ['errors', 'latency']
  const isInverse = inverseMetrics.some((m) => name.toLowerCase().includes(m))
  if (!trend || trend === 'stable') return 'text-gray-400'
  if (trend === 'up') return isInverse ? 'text-red-400' : 'text-green-400'
  return isInverse ? 'text-green-400' : 'text-yellow-400'
}

function Sparkline({ values }: { values: number[] }) {
  if (!values || values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 80
  const h = 24
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline fill="none" stroke="#0ea5e9" strokeWidth="1.5" points={points} />
    </svg>
  )
}

function MetricCard({
  icon,
  title,
  metric,
}: {
  icon: React.ReactNode
  title: string
  metric: Metric
}) {
  const changeSign = metric.change !== undefined && metric.change > 0 ? '+' : ''
  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-xs font-medium tracking-wide uppercase">{title}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-bold text-white">
            {metric.value.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-gray-500">{metric.unit}</span>
          </p>
          {metric.change !== undefined && (
            <p className={`mt-0.5 text-xs ${trendColor(metric.trend, metric.name)}`}>
              {changeSign}
              {metric.change.toFixed(1)}% vs last hour
            </p>
          )}
        </div>
        {metric.history && <Sparkline values={metric.history} />}
      </div>
    </div>
  )
}

function UsageBar({ label, value, unit }: { label: string; value: number; unit: string }) {
  const pct = Math.min(100, Math.max(0, value))
  const color = pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-sky-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-medium text-white">
          {value}
          {unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function MetricsContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<MetricsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch('/api/metrics')
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg: string = body?.error ?? `Request failed: ${res.status}`
        if (msg.toLowerCase().includes('docker') || msg.toLowerCase().includes('connect')) {
          setOffline(true)
        } else {
          setError(msg)
        }
        return
      }
      setData(await res.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 10_000)
    return () => clearInterval(interval)
  }, [fetchMetrics])

  // State 1: initial skeleton
  if (initialLoad && loading) return <ChartSkeleton />

  // State 5: offline
  if (offline) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <WifiOff className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach backend</p>
            <p className="mt-0.5 text-sm text-gray-400">Metrics require a running nself stack.</p>
          </div>
        </div>
        <Button onClick={fetchMetrics} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: error
  if (error && !data) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-red-400">Failed to load metrics</p>
            <p className="mt-0.5 text-sm text-gray-400">{error}</p>
          </div>
        </div>
        <Button onClick={fetchMetrics} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: no data
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <BarChart2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No metrics available.</p>
        <Button
          onClick={fetchMetrics}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Load Metrics
        </Button>
      </div>
    )
  }

  // States 6+7: success
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Performance Metrics</h2>
          <p className="mt-1 text-sm text-gray-400">
            Collected {new Date(data.collectedAt).toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={fetchMetrics} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Collecting…' : 'Refresh'}
        </Button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          title="Requests/s"
          metric={data.requests}
        />
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          title="Avg latency"
          metric={data.latency}
        />
        <MetricCard
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Error rate"
          metric={data.errors}
        />
        <MetricCard icon={<Loader2 className="h-4 w-4" />} title="Uptime" metric={data.uptime} />
      </div>

      {/* Resource usage */}
      <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium text-white">
          <Cpu className="h-4 w-4 text-gray-400" />
          Resource Usage
        </h3>
        <UsageBar label="CPU" value={data.cpu.value} unit={data.cpu.unit} />
        <UsageBar label="Memory" value={data.memory.value} unit={data.memory.unit} />
        <UsageBar label="Disk" value={data.disk.value} unit={data.disk.unit} />
      </div>

      {/* Connection + request detail */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={<Database className="h-4 w-4" />}
          title="Connections"
          metric={data.connections}
        />
        <MetricCard icon={<HardDrive className="h-4 w-4" />} title="Disk I/O" metric={data.disk} />
      </div>

      {/* Custom metrics */}
      {data.custom && data.custom.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">Custom Metrics</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.custom.map((m) => (
              <div key={m.name} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <p className="truncate text-xs tracking-wide text-gray-400 uppercase">{m.name}</p>
                <p className="mt-1 text-lg font-bold text-white">
                  {m.value.toLocaleString()}
                  <span className="ml-1 text-xs font-normal text-gray-500">{m.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <MetricsContent />
    </Suspense>
  )
}
