'use client'

import { Button } from '@/components/Button'
import { ChartSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  HelpCircle,
  RefreshCw,
  Server,
  Shield,
  WifiOff,
  XCircle,
  Zap,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface ComponentStatus {
  id: string
  name: string
  category: 'core' | 'optional' | 'monitoring' | 'external'
  status: 'operational' | 'degraded' | 'outage' | 'maintenance' | 'unknown'
  description?: string
  responseTimeMs?: number
  lastIncident?: string
}

interface StatusData {
  overall: 'operational' | 'degraded' | 'major_outage' | 'maintenance'
  components: ComponentStatus[]
  uptime: {
    day: number
    week: number
    month: number
  }
  checkedAt: string
}

function statusIcon(status: ComponentStatus['status'], size = 'h-4 w-4') {
  if (status === 'operational') return <CheckCircle className={`${size} text-green-400`} />
  if (status === 'degraded') return <AlertTriangle className={`${size} text-yellow-400`} />
  if (status === 'outage') return <XCircle className={`${size} text-red-400`} />
  if (status === 'maintenance') return <Clock className={`${size} text-blue-400`} />
  return <HelpCircle className={`${size} text-gray-500`} />
}

function statusLabel(status: ComponentStatus['status']) {
  const labels: Record<ComponentStatus['status'], string> = {
    operational: 'Operational',
    degraded: 'Degraded',
    outage: 'Outage',
    maintenance: 'Maintenance',
    unknown: 'Unknown',
  }
  return labels[status]
}

function statusColor(status: ComponentStatus['status']) {
  if (status === 'operational') return 'text-green-400'
  if (status === 'degraded') return 'text-yellow-400'
  if (status === 'outage') return 'text-red-400'
  if (status === 'maintenance') return 'text-blue-400'
  return 'text-gray-500'
}

function categoryIcon(cat: ComponentStatus['category']) {
  if (cat === 'core') return <Server className="h-3.5 w-3.5 text-gray-500" />
  if (cat === 'monitoring') return <Zap className="h-3.5 w-3.5 text-gray-500" />
  if (cat === 'external') return <Globe className="h-3.5 w-3.5 text-gray-500" />
  return <Shield className="h-3.5 w-3.5 text-gray-500" />
}

function OverallBanner({ overall }: { overall: StatusData['overall'] }) {
  if (overall === 'operational') {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-green-500/30 bg-green-500/10 p-5">
        <CheckCircle className="h-7 w-7 flex-shrink-0 text-green-400" />
        <div>
          <p className="text-lg font-semibold text-green-400">All systems operational</p>
          <p className="mt-0.5 text-sm text-gray-400">Every component is running normally.</p>
        </div>
      </div>
    )
  }
  if (overall === 'degraded') {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5">
        <AlertTriangle className="h-7 w-7 flex-shrink-0 text-yellow-400" />
        <div>
          <p className="text-lg font-semibold text-yellow-400">Partial system degradation</p>
          <p className="mt-0.5 text-sm text-gray-400">Some components are experiencing issues.</p>
        </div>
      </div>
    )
  }
  if (overall === 'major_outage') {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-red-500/30 bg-red-500/10 p-5">
        <XCircle className="h-7 w-7 flex-shrink-0 text-red-400" />
        <div>
          <p className="text-lg font-semibold text-red-400">Major outage in progress</p>
          <p className="mt-0.5 text-sm text-gray-400">Critical components are unavailable.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
      <Clock className="h-7 w-7 flex-shrink-0 text-blue-400" />
      <div>
        <p className="text-lg font-semibold text-blue-400">Scheduled maintenance</p>
        <p className="mt-0.5 text-sm text-gray-400">System maintenance is in progress.</p>
      </div>
    </div>
  )
}

function UptimePill({ label, value }: { label: string; value: number }) {
  const color = value >= 99.9 ? 'text-green-400' : value >= 99 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-center">
      <p className={`text-lg font-bold ${color}`}>{value.toFixed(2)}%</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  )
}

const CATEGORY_ORDER: ComponentStatus['category'][] = ['core', 'optional', 'monitoring', 'external']
const CATEGORY_LABELS: Record<ComponentStatus['category'], string> = {
  core: 'Core Services',
  optional: 'Optional Services',
  monitoring: 'Monitoring Stack',
  external: 'External Integrations',
}

function StatusContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<StatusData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch('/api/monitor')
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
    fetchStatus()
    const interval = setInterval(fetchStatus, 15_000)
    return () => clearInterval(interval)
  }, [fetchStatus])

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
            <p className="mt-0.5 text-sm text-gray-400">
              Status monitoring requires a running nself stack.
            </p>
          </div>
        </div>
        <Button onClick={fetchStatus} disabled={loading} variant="secondary" size="sm">
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
            <p className="font-medium text-red-400">Failed to load status</p>
            <p className="mt-0.5 text-sm text-gray-400">{error}</p>
          </div>
        </div>
        <Button onClick={fetchStatus} disabled={loading} variant="secondary" size="sm">
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
        <Server className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No status data available.</p>
        <Button
          onClick={fetchStatus}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Load Status
        </Button>
      </div>
    )
  }

  // Group by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    components: data.components.filter((c) => c.category === cat),
  })).filter((g) => g.components.length > 0)

  // States 6+7: success
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">System Status</h2>
          <p className="mt-1 text-sm text-gray-400">
            {data.components.length} components monitored
          </p>
        </div>
        <Button onClick={fetchStatus} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking…' : 'Refresh'}
        </Button>
      </div>

      {/* Overall banner */}
      <OverallBanner overall={data.overall} />

      {/* Uptime stats */}
      <div className="grid grid-cols-3 gap-3">
        <UptimePill label="24h uptime" value={data.uptime.day} />
        <UptimePill label="7-day uptime" value={data.uptime.week} />
        <UptimePill label="30-day uptime" value={data.uptime.month} />
      </div>

      {/* Component groups */}
      {grouped.map(({ cat, components }) => (
        <div key={cat} className="space-y-2">
          <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
            {categoryIcon(cat)}
            {CATEGORY_LABELS[cat]}
          </h3>
          <div className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10">
            {components.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center gap-3 bg-white/[0.01] px-4 py-3 transition-colors hover:bg-white/[0.03]"
              >
                {statusIcon(comp.status)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{comp.name}</p>
                  {comp.description && (
                    <p className="truncate text-xs text-gray-500">{comp.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0 space-y-0.5 text-right">
                  <p className={`text-xs font-medium ${statusColor(comp.status)}`}>
                    {statusLabel(comp.status)}
                  </p>
                  {comp.responseTimeMs !== undefined && (
                    <p className="text-xs text-gray-600">{comp.responseTimeMs}ms</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-600">
        Last checked: {new Date(data.checkedAt).toLocaleString()}
      </p>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <StatusContent />
    </Suspense>
  )
}
