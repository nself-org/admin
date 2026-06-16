'use client'

import { Button } from '@/components/Button'
import { DashboardSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  HeartPulse,
  Play,
  RefreshCw,
  RotateCcw,
  Server,
  Terminal,
  Wrench,
  XCircle,
} from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'

interface ContainerStatus {
  name: string
  status: 'running' | 'stopped' | 'restarting' | 'error'
  health?: 'healthy' | 'unhealthy' | 'starting'
  restarts?: number
  logs?: string[]
}

interface DoctorResult {
  overall: 'healthy' | 'partial' | 'critical'
  containers: ContainerStatus[]
  systemChecks: Array<{
    name: string
    status: 'pass' | 'fail' | 'warning'
    message: string
  }>
  recommendations: string[]
}

const getCsrf = () =>
  document.cookie
    .split('; ')
    .find((row) => row.startsWith('nself-csrf='))
    ?.split('=')[1] ?? ''

function DoctorContent() {
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [doctorResult, setDoctorResult] = useState<DoctorResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null)
  const [fixingIssues, setFixingIssues] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)
    setOffline(false)
    try {
      const response = await fetch('/api/nself/doctor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrf(),
        },
      })
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
      setDoctorResult(await response.json())
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }

  const fixIssues = async () => {
    setFixingIssues(true)
    try {
      const csrf = getCsrf()
      await fetch('/api/nself/doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ fix: true }),
      })
      await fetch('/api/nself/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      })
      await runDiagnostics()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fix attempt failed')
    } finally {
      setFixingIssues(false)
    }
  }

  const restartContainer = async (containerName: string) => {
    try {
      await fetch(`/api/docker/containers/${containerName}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrf() },
      })
      await runDiagnostics()
    } catch {
      setError(`Failed to restart ${containerName}`)
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'healthy':
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'stopped':
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'restarting':
      case 'starting':
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />
    }
  }

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'partial':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // State: loading (initial)
  if (initialLoad && loading) {
    return <DashboardSkeleton />
  }

  // State: offline (Docker/network down)
  if (offline) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Services Offline</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Cannot reach Docker or nself services. Make sure your stack is running.
        </p>
        <Button onClick={runDiagnostics} variant="primary" className="mt-6">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  // State: error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <XCircle className="mb-4 h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Diagnostics Failed</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
        <Button onClick={runDiagnostics} variant="secondary" className="mt-6">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <HeartPulse className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">System Doctor</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Diagnose and fix issues with your nself services
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={runDiagnostics} variant="secondary" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Run Diagnostics
          </Button>
          {doctorResult?.overall !== 'healthy' && (
            <Button onClick={fixIssues} variant="primary" disabled={fixingIssues}>
              {fixingIssues ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-4 w-4" />
                  Auto Fix Issues
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* State: empty (not loading, no result yet) */}
      {!doctorResult && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HeartPulse className="mb-4 h-12 w-12 text-zinc-400" />
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">No Results Yet</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Run diagnostics to check your system health.
          </p>
          <Button onClick={runDiagnostics} variant="primary" className="mt-6">
            <RefreshCw className="mr-2 h-4 w-4" />
            Run Diagnostics
          </Button>
        </div>
      )}

      {/* State: partial / success — overall status */}
      {doctorResult && (
        <div className={`rounded-xl border-2 p-6 ${getOverallStatusColor(doctorResult.overall)}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                System Status:{' '}
                {doctorResult.overall === 'healthy'
                  ? 'All Services Healthy'
                  : doctorResult.overall === 'partial'
                    ? 'Some Services Need Attention'
                    : 'Critical Issues Detected'}
              </h2>
              <p className="mt-1 text-sm opacity-75">
                {doctorResult.containers.filter((c) => c.status === 'running').length} of{' '}
                {doctorResult.containers.length} containers running
              </p>
            </div>
            <div className="text-3xl">
              {doctorResult.overall === 'healthy'
                ? '✅'
                : doctorResult.overall === 'partial'
                  ? '⚠️'
                  : '❌'}
            </div>
          </div>
        </div>
      )}

      {/* Container Status + System Checks grid */}
      {doctorResult && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 flex items-center text-lg font-semibold">
              <Server className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
              Container Status
            </h3>
            <div className="space-y-3">
              {doctorResult.containers.map((container) => (
                <div
                  key={container.name}
                  className="flex cursor-pointer items-center justify-between rounded-lg bg-zinc-50 p-3 transition-colors hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  onClick={() => setSelectedContainer(container.name)}
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(container.status)}
                    <div>
                      <p className="text-sm font-medium">
                        {container.name.replace('my_project_', '')}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {container.health && `Health: ${container.health}`}
                        {container.restarts !== undefined &&
                          container.restarts > 0 &&
                          ` • ${container.restarts} restarts`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {container.status === 'running' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          restartContainer(container.name)
                        }}
                        className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        title="Restart container"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          restartContainer(container.name)
                        }}
                        className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        title="Start container"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 flex items-center text-lg font-semibold">
              <Terminal className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
              System Checks
            </h3>
            <div className="space-y-3">
              {doctorResult.systemChecks.map((check, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900"
                >
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{check.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{check.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {doctorResult && doctorResult.recommendations.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
          <h3 className="mb-3 text-lg font-semibold text-blue-900 dark:text-blue-100">
            Recommendations
          </h3>
          <ul className="space-y-2">
            {doctorResult.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2 text-blue-600 dark:text-blue-400">•</span>
                <span className="text-sm text-blue-800 dark:text-blue-200">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Container Logs Modal */}
      {selectedContainer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedContainer(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-6 dark:bg-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Container Logs: {selectedContainer.replace('my_project_', '')}
              </h3>
              <button
                onClick={() => setSelectedContainer(null)}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 font-mono text-xs text-zinc-100">
              {doctorResult?.containers
                .find((c) => c.name === selectedContainer)
                ?.logs?.join('\n') || 'No logs available'}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SystemDoctorPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DoctorContent />
    </Suspense>
  )
}
