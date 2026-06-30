'use client'

/**
 * Purpose:      /system/diagnostics — runs nself doctor and renders check results.
 * Inputs:       Fetches /api/nself/diagnostics on mount.
 * Outputs:      Diagnostic check list with pass/fail/warning status badges.
 * Constraints:  Offline/error/skeleton/retry states follow the 7-UI-state
 *               pattern used across all /system/* pages.
 * SPORT:        F02 CLI commands · F08 service inventory
 */

import { Button } from '@/components/Button'
import { ListSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Stethoscope,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface DiagnosticCheck {
  name: string
  status: 'pass' | 'fail' | 'warning' | 'info'
  message: string
  detail?: string
}

interface DiagnosticsData {
  checks: DiagnosticCheck[]
  overall?: 'healthy' | 'warning' | 'critical' | 'pass' | string
  runAt?: string
  rawOutput?: string
  projectPath?: string
}

function DiagnosticsContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<DiagnosticsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const response = await fetch('/api/nself/diagnostics')
      if (response.status === 401) {
        window.location.href = '/login'
        return
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        const msg: string = body?.error ?? `Request failed: ${response.status}`
        if (msg.toLowerCase().includes('docker') || msg.toLowerCase().includes('connect')) {
          setOffline(true)
        } else {
          setError(msg)
        }
        return
      }
      setData(await response.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  useEffect(() => {
    fetchDiagnostics()
  }, [fetchDiagnostics])

  // State 1: Initial skeleton
  if (initialLoad && loading) return <ListSkeleton />

  // State 5: Offline
  if (offline) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <WifiOff className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-400">Docker not reachable</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Ensure the nSelf stack is running before running diagnostics.
            </p>
          </div>
        </div>
        <Button onClick={fetchDiagnostics} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: Error
  if (error && !data) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-red-400">Diagnostics failed</p>
            <p className="mt-0.5 text-sm text-gray-400">{error}</p>
          </div>
        </div>
        <Button onClick={fetchDiagnostics} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: No data
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>No diagnostics data available.</p>
        <Button
          onClick={fetchDiagnostics}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Run diagnostics
        </Button>
      </div>
    )
  }

  const checks = data.checks ?? []
  const passed = checks.filter((c) => c.status === 'pass').length
  const failed = checks.filter((c) => c.status === 'fail').length
  const warnings = checks.filter((c) => c.status === 'warning').length
  const isHealthy = failed === 0

  // States 6 + 7: Success
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">System Diagnostics</h2>
          {data.runAt && (
            <p className="mt-1 text-sm text-gray-400">
              Last run: {new Date(data.runAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDiagnostics} disabled={loading} variant="secondary" size="sm">
            {/* State 2: Refresh spinner */}
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Running…' : 'Run Diagnostics'}
          </Button>
        </div>
      </div>

      {/* Overall status banner */}
      <div
        className={`flex items-center gap-3 rounded-lg border p-4 ${
          isHealthy
            ? 'border-green-500/30 bg-green-500/10'
            : 'border-red-500/30 bg-red-500/10'
        }`}
      >
        {isHealthy ? (
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-400" />
        ) : (
          <XCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
        )}
        <div>
          <p className={`font-medium ${isHealthy ? 'text-green-400' : 'text-red-400'}`}>
            {isHealthy ? 'All checks passed' : `${failed} check${failed !== 1 ? 's' : ''} failed`}
          </p>
          <p className="mt-0.5 text-sm text-gray-400">
            {passed} passed · {failed} failed · {warnings} warnings
          </p>
        </div>
      </div>

      {/* Check list */}
      {checks.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <Stethoscope className="mx-auto mb-3 h-8 w-8 text-gray-500" />
          <p className="text-gray-400">No diagnostic checks found.</p>
          <p className="mt-1 text-sm text-gray-500">
            Run <code className="font-mono text-sky-400">nself doctor</code> to generate results.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {checks.map((check, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              {check.status === 'pass' ? (
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
              ) : check.status === 'fail' ? (
                <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{check.name}</p>
                <p className="mt-0.5 text-sm text-gray-400">{check.message}</p>
                {check.detail && (
                  <p className="mt-1 text-xs text-gray-500">{check.detail}</p>
                )}
              </div>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                  check.status === 'pass'
                    ? 'bg-green-500/10 text-green-400'
                    : check.status === 'fail'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                }`}
              >
                {check.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DiagnosticsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <DiagnosticsContent />
    </Suspense>
  )
}
