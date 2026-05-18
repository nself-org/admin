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
      return <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
    case 'fail':
      return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
    default:
      return <ClipboardList className="h-4 w-4 text-gray-400 flex-shrink-0" />
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
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <WifiOff className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-400">Docker not reachable</p>
            <p className="text-sm text-gray-400 mt-0.5">
              Make sure the nself stack is running before running diagnostics.
            </p>
          </div>
        </div>
        <Button onClick={runDiagnostics} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 4: Error
  if (error && !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-400">Diagnostics failed</p>
            <p className="text-sm text-gray-400 mt-0.5">{error}</p>
          </div>
        </div>
        <Button onClick={runDiagnostics} disabled={loading} variant="secondary" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    )
  }

  // State 3: No data yet
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-400">
        <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No diagnostics data available.</p>
        <Button onClick={runDiagnostics} disabled={loading} variant="secondary" size="sm" className="mt-3">
          <RefreshCw className="h-4 w-4 mr-2" />
          Run Diagnostics
        </Button>
      </div>
    )
  }

  const overallColor =
    data.overall === 'healthy'
      ? 'green'
      : data.overall === 'warning'
        ? 'yellow'
        : 'red'

  const overallBg =
    data.overall === 'healthy'
      ? 'bg-green-500/10 border-green-500/30'
      : data.overall === 'warning'
        ? 'bg-yellow-500/10 border-yellow-500/30'
        : 'bg-red-500/10 border-red-500/30'

  const overallText = data.overall === 'healthy'
    ? 'text-green-400'
    : data.overall === 'warning'
      ? 'text-yellow-400'
      : 'text-red-400'

  const passCount = data.checks.filter((c) => c.status === 'pass').length
  const failCount = data.checks.filter((c) => c.status === 'fail').length
  const warnCount = data.checks.filter((c) => c.status === 'warning').length

  // States 6 + 7: Success
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">System Diagnostics</h2>
          <p className="text-sm text-gray-400 mt-1">
            Last run: {new Date(data.runAt).toLocaleString()}
          </p>
        </div>
        <Button onClick={runDiagnostics} disabled={loading} variant="secondary" size="sm">
          {/* State 2: Refresh spinner */}
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running…' : 'Run Again'}
        </Button>
      </div>

      {/* Overall status */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${overallBg}`}>
        {data.overall === 'healthy'
          ? <CheckCircle className={`h-5 w-5 text-${overallColor}-400 flex-shrink-0`} />
          : data.overall === 'warning'
            ? <AlertTriangle className={`h-5 w-5 text-${overallColor}-400 flex-shrink-0`} />
            : <XCircle className={`h-5 w-5 text-${overallColor}-400 flex-shrink-0`} />
        }
        <div className="flex-1">
          <p className={`font-medium ${overallText} capitalize`}>
            {data.overall === 'healthy' ? 'All checks passed' : `System ${data.overall}`}
          </p>
          <p className="text-sm text-gray-400 mt-0.5">
            {passCount} passed · {failCount} failed · {warnCount} warnings
          </p>
        </div>
      </div>

      {/* Checks list — State 3 empty variant */}
      {data.checks.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-gray-400">No diagnostic checks returned.</p>
          <p className="text-sm text-gray-500 mt-1">
            The output may not have been parseable. See raw output below.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden divide-y divide-white/5">
          {data.checks.map((check, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
              {statusIcon(check.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{check.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{check.message}</p>
                {check.detail && (
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{check.detail}</p>
                )}
              </div>
              <span className={`text-xs font-medium flex-shrink-0 ${
                check.status === 'pass'
                  ? 'text-green-400'
                  : check.status === 'fail'
                    ? 'text-red-400'
                    : check.status === 'warning'
                      ? 'text-yellow-400'
                      : 'text-gray-400'
              }`}>
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
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showRaw ? 'Hide' : 'Show'} raw output
          </button>
          {showRaw && (
            <pre className="mt-2 p-3 rounded-lg bg-black/40 border border-white/10 text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-auto max-h-64">
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
