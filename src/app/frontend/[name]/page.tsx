'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import type { FrontendApp } from '@/types/deployment'
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  GitBranch,
  GitCommit,
  Globe,
  Layers,
  Play,
  RefreshCw,
  Settings,
  Terminal,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface BuildLog {
  timestamp: string
  message: string
  type: 'info' | 'warn' | 'error' | 'success'
}

interface Deployment {
  id: string
  version: string
  commit: string
  status: 'success' | 'failed' | 'building'
  deployedAt: string
  duration: number
}

function FrontendDetailContent() {
  const params = useParams()
  const appName = params.name as string

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [app, setApp] = useState<FrontendApp | null>(null)
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [buildLogs, setBuildLogs] = useState<BuildLog[]>([])
  const [metricsData, setMetricsData] = useState<
    Array<{ time: string; requests: number; latency: number }>
  >([])

  const fetchApp = useCallback(async () => {
    try {
      // Mock data - replace with real API
      setApp({
        id: 'app-1',
        name: appName,
        framework: 'Next.js',
        status: 'running',
        url: `https://${appName}.example.com`,
        branch: 'main',
        lastDeployed: new Date(Date.now() - 3600000).toISOString(),
        buildTime: 45,
        metrics: {
          requests: 15000,
          latency: 120,
          errors: 5,
        },
      })

      setDeployments([
        {
          id: 'dep-1',
          version: 'v1.3.0',
          commit: 'a1b2c3d',
          status: 'success',
          deployedAt: new Date(Date.now() - 3600000).toISOString(),
          duration: 45,
        },
        {
          id: 'dep-2',
          version: 'v1.2.9',
          commit: 'b2c3d4e',
          status: 'success',
          deployedAt: new Date(Date.now() - 86400000).toISOString(),
          duration: 42,
        },
        {
          id: 'dep-3',
          version: 'v1.2.8',
          commit: 'c3d4e5f',
          status: 'failed',
          deployedAt: new Date(Date.now() - 172800000).toISOString(),
          duration: 38,
        },
      ])

      setBuildLogs([
        {
          timestamp: '10:30:01',
          message: 'Installing dependencies...',
          type: 'info',
        },
        {
          timestamp: '10:30:15',
          message: 'Dependencies installed successfully',
          type: 'success',
        },
        {
          timestamp: '10:30:16',
          message: 'Running build command...',
          type: 'info',
        },
        {
          timestamp: '10:30:35',
          message: 'Warning: Large bundle size detected',
          type: 'warn',
        },
        {
          timestamp: '10:30:45',
          message: 'Build completed successfully',
          type: 'success',
        },
        {
          timestamp: '10:30:46',
          message: 'Deploying to edge network...',
          type: 'info',
        },
        {
          timestamp: '10:30:52',
          message: 'Deployment complete!',
          type: 'success',
        },
      ])

      // Generate mock metrics data
      const data = []
      for (let i = 23; i >= 0; i--) {
        data.push({
          time: `${String(23 - i).padStart(2, '0')}:00`,
          requests: Math.floor(Math.random() * 1000) + 500,
          latency: Math.floor(Math.random() * 50) + 80,
        })
      }
      setMetricsData(data)
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [appName])

  useEffect(() => {
    fetchApp()
  }, [fetchApp])

  const deployApp = async () => {
    setActionLoading('deploy')
    try {
      await fetch(`/api/frontend/${appName}/deploy`, { method: 'POST' })
      await fetchApp()
    } finally {
      setActionLoading(null)
    }
  }

  const restartApp = async () => {
    setActionLoading('restart')
    try {
      await fetch(`/api/frontend/${appName}/restart`, { method: 'POST' })
      await fetchApp()
    } finally {
      setActionLoading(null)
    }
  }

  const getFrameworkIcon = (framework: string) => {
    switch (framework?.toLowerCase()) {
      case 'next.js':
        return <Zap className="h-6 w-6 text-black dark:text-white" />
      case 'react':
        return <Activity className="h-6 w-6 text-blue-500" />
      case 'astro':
        return <Globe className="h-6 w-6 text-sky-500" />
      default:
        return <Layers className="h-6 w-6 text-zinc-500" />
    }
  }

  const getLogColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-500'
      case 'warn':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-zinc-400'
    }
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
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
          <Link
            href="/frontend"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Frontend Apps
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-700">
                {getFrameworkIcon(app?.framework || '')}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {appName}
                </h1>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {app?.framework}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      app?.status === 'running'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {app?.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={restartApp}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {actionLoading === 'restart' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Restart
              </button>
              <button
                onClick={deployApp}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
              >
                {actionLoading === 'deploy' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Deploy
              </button>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <GitBranch className="h-8 w-8 text-cyan-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Branch
                </p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {app?.branch}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Requests/hr
                </p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {app?.metrics?.requests.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Latency
                </p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {app?.metrics?.latency}ms
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Build Time
                </p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {app?.buildTime}s
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* URL */}
        {app?.url && (
          <div className="mb-8">
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-cyan-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-cyan-400 dark:hover:bg-zinc-700"
            >
              <ExternalLink className="h-4 w-4" />
              {app.url}
            </a>
          </div>
        )}

        {/* Metrics Chart */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Traffic & Latency (24h)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181B',
                    border: '1px solid #3F3F46',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="requests"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={false}
                  name="Requests"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="latency"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                  name="Latency (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Recent Deployments */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Recent Deployments
            </h3>
            <div className="space-y-3">
              {deployments.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900"
                >
                  <div className="flex items-center gap-3">
                    {dep.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : dep.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {dep.version}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <GitCommit className="h-3 w-3" />
                        {dep.commit}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-zinc-500">
                    <p>{new Date(dep.deployedAt).toLocaleDateString()}</p>
                    <p>{dep.duration}s</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Build Logs */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
              <Terminal className="h-5 w-5" />
              Latest Build Logs
            </h3>
            <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm">
              {buildLogs.map((log, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="text-zinc-600">{log.timestamp}</span>
                  <span className={getLogColor(log.type)}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center gap-4">
            <Link
              href={`/frontend/${appName}/settings`}
              className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
            <Link
              href={`/frontend/${appName}/logs`}
              className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <Terminal className="h-5 w-5" />
              View Logs
            </Link>
          </div>
          <button className="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
            <Trash2 className="h-5 w-5" />
            Delete App
          </button>
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-cyan-500">
                nself frontend deploy {appName}
              </span>{' '}
              - Deploy this app
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-cyan-500">
                nself frontend logs {appName}
              </span>{' '}
              - View logs
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-cyan-500">
                nself frontend restart {appName}
              </span>{' '}
              - Restart app
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-cyan-500">
                nself frontend env {appName} --set KEY=value
              </span>{' '}
              - Set env var
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function FrontendDetailPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <FrontendDetailContent />
    </Suspense>
  )
}
