'use client'

import { Button } from '@/components/Button'
import { DashboardSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle,
  Info,
  Loader2,
  RefreshCw,
  Trash2,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface Alert {
  id: string
  level: 'critical' | 'warning' | 'info' | 'resolved'
  title: string
  message: string
  source: string
  timestamp: string
  acknowledged: boolean
}

interface AlertsData {
  alerts: Alert[]
  unacknowledgedCount: number
  lastUpdatedAt: string
}

function levelIcon(level: Alert['level']) {
  if (level === 'critical') return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
  if (level === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
  if (level === 'resolved') return <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
  return <Info className="h-4 w-4 text-blue-400 flex-shrink-0" />
}

function levelBg(level: Alert['level']) {
  if (level === 'critical') return 'border-red-500/30 bg-red-500/5'
  if (level === 'warning') return 'border-yellow-500/30 bg-yellow-500/5'
  if (level === 'resolved') return 'border-green-500/30 bg-green-500/5'
  return 'border-blue-500/30 bg-blue-500/5'
}

function levelBadge(level: Alert['level']) {
  if (level === 'critical') return 'bg-red-500/20 text-red-400'
  if (level === 'warning') return 'bg-yellow-500/20 text-yellow-400'
  if (level === 'resolved') return 'bg-green-500/20 text-green-400'
  return 'bg-blue-500/20 text-blue-400'
}

function AlertsContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<AlertsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info' | 'resolved'>('all')

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch('/api/notifications')
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
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30_000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  async function acknowledge(id: string) {
    setActionId(id)
    const csrf =
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1] ?? ''
    try {
      const res = await fetch(`/api/notifications/${id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
      })
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (res.ok) await fetchAlerts()
    } catch {
      setOffline(true)
    } finally {
      setActionId(null)
    }
  }

  async function dismiss(id: string) {
    setActionId(id)
    const csrf =
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1] ?? ''
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrf },
      })
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (res.ok) await fetchAlerts()
    } catch {
      setOffline(true)
    } finally {
      setActionId(null)
    }
  }

  // State 1: initial skeleton
  if (initialLoad && loading) return <DashboardSkeleton />

  // State 5: offline
  if (offline) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <WifiOff className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach backend</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Alerts require a running nself stack.
            </p>
          </div>
        </div>
        <Button onClick={fetchAlerts} disabled={loading} variant="secondary" size="sm">
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
            <p className="font-medium text-red-400">Failed to load alerts</p>
            <p className="text-sm text-gray-400 mt-0.5">{error}</p>
          </div>
        </div>
        <Button onClick={fetchAlerts} disabled={loading} variant="secondary" size="sm">
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
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No alert data available.</p>
        <Button onClick={fetchAlerts} disabled={loading} variant="secondary" size="sm" className="mt-3">
          <RefreshCw className="h-4 w-4 mr-2" />
          Load Alerts
        </Button>
      </div>
    )
  }

  const filtered = data.alerts.filter((a) => filter === 'all' || a.level === filter)

  // States 6+7: success / empty
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Alerts</h2>
          <p className="text-sm text-gray-400 mt-1">
            {data.unacknowledgedCount > 0
              ? `${data.unacknowledgedCount} unacknowledged alert${data.unacknowledgedCount !== 1 ? 's' : ''}`
              : 'All alerts acknowledged'}
          </p>
        </div>
        <Button onClick={fetchAlerts} disabled={loading || !!actionId} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'critical', 'warning', 'info', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {f}
            {f !== 'all' && (
              <span className="ml-1 opacity-60">
                ({data.alerts.filter((a) => a.level === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No {filter !== 'all' ? filter : ''} alerts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border p-4 ${levelBg(alert.level)} ${alert.acknowledged ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                {levelIcon(alert.level)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white">{alert.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${levelBadge(alert.level)}`}>
                      {alert.level}
                    </span>
                    {alert.acknowledged && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">
                        acknowledged
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>Source: {alert.source}</span>
                    <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!alert.acknowledged && alert.level !== 'resolved' && (
                    <button
                      onClick={() => acknowledge(alert.id)}
                      disabled={actionId === alert.id}
                      title="Acknowledge"
                      className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-40"
                    >
                      {actionId === alert.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => dismiss(alert.id)}
                    disabled={!!actionId}
                    title="Dismiss"
                    className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    {actionId === alert.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.lastUpdatedAt && (
        <p className="text-xs text-gray-600">
          Last updated: {new Date(data.lastUpdatedAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AlertsContent />
    </Suspense>
  )
}
