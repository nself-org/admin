'use client'

import { Button } from '@/components/Button'
import { FormSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  Database,
  Loader2,
  RefreshCw,
  Trash2,
  WifiOff,
  Zap,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

interface SeedStatus {
  seeded: boolean
  tables: { name: string; rowCount: number }[]
  lastSeededAt?: string
}

interface SeedResult {
  success: boolean
  message: string
  tablesAffected: string[]
  rowsInserted: number
  errors?: string[]
}

type SeedAction = 'seed' | 'reset' | 'status'

function SeedContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [status, setStatus] = useState<SeedStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [action, setAction] = useState<SeedAction | null>(null)
  const [result, setResult] = useState<SeedResult | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const res = await fetch('/api/database/seed')
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
      setStatus(await res.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    }
  }, [fetchStatus])

  async function runSeedAction(seedAction: SeedAction) {
    if (seedAction === 'reset' && !confirmReset) {
      setConfirmReset(true)
      confirmTimerRef.current = setTimeout(() => setConfirmReset(false), 5000)
      return
    }
    setConfirmReset(false)
    setAction(seedAction)
    setResult(null)
    setError(null)
    const csrf =
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1] ?? ''
    try {
      const res = await fetch('/api/database/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({ action: seedAction }),
      })
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      if (!res.ok) {
        const msg: string = data?.error ?? `Request failed: ${res.status}`
        if (msg.toLowerCase().includes('docker') || msg.toLowerCase().includes('connect')) {
          setOffline(true)
        } else {
          setError(msg)
        }
        return
      }
      setResult(data)
      await fetchStatus()
    } catch {
      setOffline(true)
    } finally {
      setAction(null)
    }
  }

  // State 1: initial skeleton
  if (initialLoad && loading) return <FormSkeleton />

  // State 5: offline
  if (offline) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <WifiOff className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-400">Cannot reach database</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Seed operations require a running nself stack with Postgres.
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
  if (error && !status) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-red-400">Failed to load seed status</p>
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
  if (!status) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Database className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No seed information available.</p>
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

  // States 6+7: success
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Seed Data</h2>
          <p className="mt-1 text-sm text-gray-400">
            Manage development seed data for your database
          </p>
        </div>
        <Button onClick={fetchStatus} disabled={loading || !!action} variant="secondary" size="sm">
          {/* State 2: refresh spinner */}
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {/* Seed status */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-4 flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${status.seeded ? 'bg-green-400' : 'bg-gray-500'}`}
          />
          <span className="text-sm font-medium text-white">
            {status.seeded ? 'Database seeded' : 'Not seeded'}
          </span>
          {status.lastSeededAt && (
            <span className="ml-auto text-xs text-gray-500">
              Last seeded: {new Date(status.lastSeededAt).toLocaleString()}
            </span>
          )}
        </div>
        {status.tables.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {status.tables.map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              >
                <span className="font-mono text-xs text-gray-300">{t.name}</span>
                <span className="text-xs text-gray-500">{t.rowCount.toLocaleString()} rows</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => runSeedAction('seed')} disabled={!!action} size="sm">
          {action === 'seed' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Zap className="mr-2 h-4 w-4" />
          )}
          {action === 'seed' ? 'Seeding…' : 'Run Seed'}
        </Button>
        <Button
          onClick={() => runSeedAction('reset')}
          disabled={!!action}
          variant={confirmReset ? 'outline' : 'secondary'}
          size="sm"
        >
          {action === 'reset' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          {action === 'reset'
            ? 'Resetting…'
            : confirmReset
              ? 'Confirm Reset (5s)'
              : 'Reset & Re-seed'}
        </Button>
      </div>

      {confirmReset && (
        <p className="text-xs text-orange-400">
          This will delete all seed data and re-run seeds. Click again to confirm.
        </p>
      )}

      {/* Operation result */}
      {result && (
        <div
          className={`space-y-3 rounded-lg border p-4 ${
            result.success
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}
        >
          <div className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
            )}
            <p className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.message}
            </p>
          </div>
          {result.success && (
            <div className="space-y-1 text-xs text-gray-400">
              <p>Tables affected: {result.tablesAffected.join(', ') || 'none'}</p>
              <p>Rows inserted: {result.rowsInserted.toLocaleString()}</p>
            </div>
          )}
          {result.errors && result.errors.length > 0 && (
            <ul className="space-y-1">
              {result.errors.map((e, i) => (
                <li key={i} className="font-mono text-xs text-red-300">
                  {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SeedContent />
    </Suspense>
  )
}
