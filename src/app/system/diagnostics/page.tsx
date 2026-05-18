'use client'

import { Button } from '@/components/Button'
import { DashboardSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  RefreshCw,
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

interface DiagnosticsResult {
  overall: 'healthy' | 'warning' | 'critical'
  checks: DiagnosticCheck[]
  rawOutput: string
  projectPath: string
  runAt: string
}

const statusIcon = (status: DiagnosticCheck['status']) => {
  switch (status) {
    case 'pass':
      return <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-400" />
    case 'fail':
      return <XCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-400" />
    default:
      return <ClipboardList className="h-4 w-4 flex-shrink-0 text-gray-400" />
  }
}

function DiagnosticsContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [data, setData] = useState<DiagnosticsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  const runDiagnostics = useCallback(async () => {
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
    runDiagnostics()
  }, [runDiagnostics])

  // State 1: Initial skeleton
  if (initialLoad && loading) return <DashboardSkeleton />

  // State 5: Offline
  if (offline) {
    return (
      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <WifiOff className="h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <p className="font-medium text-yellow-400">Docker not reachable</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Make sure the nself stack is running before running diagnostics.
            </p>
          </div>
        </div>
        <Button onClick={runDiagnostics} disabled={loading} variant="secondary" size="sm">
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
        <Button onClick={runDiagnostics} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: No data yet
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No diagnostics data available.</p>
        <Button
          onClick={runDiagnostics}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Run Diagnostics
        </Button>
      </div>
    )
  }

  const overallColor =
    data.overall === 'healthy' ? 'green' : data.overall === 'warning' ? 'yellow' : 'red'

  const overallBg =
    data.overall === 'healthy'
      ? 'bg-green-500/10 border-green-500/30'
      : data.overall === 'warning'
        ? 'bg-yellow-500/10 border-yellow-500/30'
        : 'bg-red-500/10 border-red-500/30'

  const overallText =
    data.overall === 'healthy'
      ? 'text-green-400'
      : data.overall === 'warning'
        ? 'text-yellow-400'
        : 'text-red-400'

  const passCount = data.checks.filter((c) => c.status === 'pass').length
  const failCount = data.checks.filter((c) => c.status === 'fail').length
  const warnCount = data.checks.filter((c) => c.status === 'warning').length

  // States 6 + 7: Success
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">System Diagnostics</h2>
          <p className="mt-1 text-sm text-gray-400">
            Last run: {new Date(data.runAt).toLocaleString()}
          </p>
        </div>
        <Button onClick={runDiagnostics} disabled={loading} variant="secondary" size="sm">
          {/* State 2: Refresh spinner */}
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running…' : 'Run Again'}
        </Button>
      </div>

      {/* Overall status */}
      <div className={`flex items-center gap-3 rounded-lg border p-4 ${overallBg}`}>
        {data.overall === 'healthy' ? (
          <CheckCircle className={`h-5 w-5 text-${overallColor}-400 flex-shrink-0`} />
        ) : data.overall === 'warning' ? (
          <AlertTriangle className={`h-5 w-5 text-${overallColor}-400 flex-shrink-0`} />
        ) : (
          <XCircle className={`h-5 w-5 text-${overallColor}-400 flex-shrink-0`} />
        )}
        <div className="flex-1">
          <p className={`font-medium ${overallText} capitalize`}>
            {data.overall === 'healthy' ? 'All checks passed' : `System ${data.overall}`}
          </p>
          <p className="mt-0.5 text-sm text-gray-400">
            {passCount} passed · {failCount} failed · {warnCount} warnings
          </p>
        </div>
      </div>

      {/* Checks list — State 3 empty variant */}
      {data.checks.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400">No diagnostic checks returned.</p>
          <p className="mt-1 text-sm text-gray-500">
            The output may not have been parseable. See raw output below.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10">
          {data.checks.map((check, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
            >
              {statusIcon(check.status)}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{check.name}</p>
                <p className="mt-0.5 text-xs text-gray-400">{check.message}</p>
                {check.detail && (
                  <p className="mt-0.5 font-mono text-xs text-gray-500">{check.detail}</p>
                )}
              </div>
              <span
                className={`flex-shrink-0 text-xs font-medium ${
                  check.status === 'pass'
                    ? 'text-green-400'
                    : check.status === 'fail'
                      ? 'text-red-400'
                      : check.status === 'warning'
                        ? 'text-yellow-400'
                        : 'text-gray-400'
                }`}
              >
                {check.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Raw output toggle */}
      {data.rawOutput && (
        <div>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs text-gray-500 transition-colors hover:text-gray-300"
          >
            {showRaw ? 'Hide' : 'Show'} raw output
          </button>
          {showRaw && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs whitespace-pre-wrap text-gray-300">
              {data.rawOutput}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export default function DiagnosticsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DiagnosticsContent />
    </Suspense>
  )
}
