'use client'

import { Button } from '@/components/Button'
import { ChartSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface ServiceHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  latencyMs?: number
  uptime?: number
  lastChecked?: string
  message?: string
}

interface HealthData {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  services: ServiceHealth[]
  checkedAt: string
}

function statusIcon(status: ServiceHealth['status'], size = 'h-4 w-4') {
  if (status === 'healthy') return <CheckCircle className={`${size} text-green-400 flex-shrink-0`} />
  if (status === 'degraded') return <AlertTriangle className={`${size} text-yellow-400 flex-shrink-0`} />
  if (status === 'unhealthy') return <XCircle className={`${size} text-red-400 flex-shrink-0`} />
  return <Clock className={`${size} text-gray-500 flex-shrink-0`} />
}

function statusColor(status: ServiceHealth['status']) {
  if (status === 'healthy') return 'text-green-400'
  if (status === 'degraded') return 'text-yellow-400'
  if (status === 'unhealthy') return 'text-red-400'
  return 'text-gray-500'
}

function statusBg(status: ServiceHealth['status']) {
  if (status === 'healthy') return 'bg-green-500/10 border-green-500/20'
  if (status === 'degraded') return 'bg-yellow-500/10 border-yellow-500/20'
  if (status === 'unhealthy') return 'bg-red-500/10 border-red-500/20'
  return 'bg-white/5 border-white/10'
}

function overallBanner(overall: HealthData['overall']) {
  if (overall === 'healthy') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
        <div>
          <p className="font-semibold text-green-400">All systems healthy</p>
          <p className="text-sm text-gray-400 mt-0.5">Every service is operating within normal parameters.</p>
        </div>
      </div>
    )
  }
  if (overall === 'degraded') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
        <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
        <div>
          <p className="font-semibold text-yellow-400">Some services degraded</p>
          <p className="text-sm text-gray-400 mt-0.5">One or more services are experiencing issues.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
      <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
      <div>
        <p className="font-semibold text-red-400">Services unhealthy</p>
        <p className="text-sm text-gray-400 mt-0.5">Critical services are down or unreachable.</p>
      </div>
    </div>
  )
}

function HealthContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<HealthData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch('/api/health?all=true')
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
    fetchHealth()
    const interval = setInterval(fetchHealth, 15_000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  // State 1: initial skeleton
  if (initialLoad && loading) return <ChartSkeleton />

  // State 5: offline
  if (offline) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <WifiOff className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach backend</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Health data requires a running nself stack.
            </p>
          </div>
        </div>
        <Button onClick={fetchHealth} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: error
  if (error && !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-400">Failed to load health data</p>
            <p className="text-sm text-gray-400 mt-0.5">{error}</p>
          </div>
        </div>
        <Button onClick={fetchHealth} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: no data
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No health data available.</p>
        <Button onClick={fetchHealth} disabled={loading} variant="secondary" size="sm" className="mt-3">
          <RefreshCw className="h-4 w-4 mr-2" />
          Load Health
        </Button>
      </div>
    )
  }

  const healthy = data.services.filter((s) => s.status === 'healthy').length
  const degraded = data.services.filter((s) => s.status === 'degraded').length
  const unhealthy = data.services.filter((s) => s.status === 'unhealthy').length

  // States 6+7: success
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Service Health</h2>
          <p className="text-sm text-gray-400 mt-1">
            {data.services.length} services monitored
          </p>
        </div>
        <Button onClick={fetchHealth} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking…' : 'Refresh'}
        </Button>
      </div>

      {/* Overall banner */}
      {overallBanner(data.overall)}

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{healthy}</p>
          <p className="text-xs text-gray-400 mt-0.5">Healthy</p>
        </div>
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400">{degraded}</p>
          <p className="text-xs text-gray-400 mt-0.5">Degraded</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
          <p className="text-2xl font-bold text-red-400">{unhealthy}</p>
          <p className="text-xs text-gray-400 mt-0.5">Unhealthy</p>
        </div>
      </div>

      {/* Service list */}
      <div className="space-y-2">
        {data.services.map((svc) => (
          <div
            key={svc.name}
            className={`rounded-lg border p-3 ${statusBg(svc.status)}`}
          >
            <div className="flex items-center gap-3">
              {statusIcon(svc.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white capitalize">{svc.name}</span>
                  <span className={`text-xs capitalize ${statusColor(svc.status)}`}>
                    {svc.status}
                  </span>
                </div>
                {svc.message && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{svc.message}</p>
                )}
              </div>
              <div className="text-right text-xs text-gray-500 flex-shrink-0 space-y-0.5">
                {svc.latencyMs !== undefined && (
                  <p>{svc.latencyMs}ms</p>
                )}
                {svc.uptime !== undefined && (
                  <p className="flex items-center gap-1 justify-end">
                    <Loader2 className="h-3 w-3" />
                    {svc.uptime.toFixed(2)}%
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-600">
        Last checked: {new Date(data.checkedAt).toLocaleString()}
      </p>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HealthContent />
    </Suspense>
  )
}
