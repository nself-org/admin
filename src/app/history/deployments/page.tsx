'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { TableSkeleton } from '@/components/skeletons'
import type { Deployment, Environment } from '@/types/deployment'
import {
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  Clock,
  Download,
  Eye,
  Filter,
  GitBranch,
  GitCommit,
  RefreshCw,
  Rocket,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

function DeploymentHistoryContent() {
  const [loading, setLoading] = useState(true)
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [filterEnv, setFilterEnv] = useState<Environment | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const environments: (Environment | 'all')[] = [
    'all',
    'local',
    'development',
    'staging',
    'production',
  ]

  const fetchDeployments = useCallback(async () => {
    try {
      // Mock data - replace with real API
      const mockDeployments: Deployment[] = [
        {
          id: 'deploy-1',
          environment: 'production',
          strategy: 'blue-green',
          status: 'success',
          version: 'v1.3.0',
          commit: 'a1b2c3d',
          branch: 'main',
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date(Date.now() - 3500000).toISOString(),
          duration: 100,
          deployedBy: 'developer@example.com',
          changes: ['Add user profile feature', 'Fix payment bug'],
          rollbackAvailable: true,
        },
        {
          id: 'deploy-2',
          environment: 'staging',
          strategy: 'standard',
          status: 'success',
          version: 'v1.3.0-rc.1',
          commit: 'b2c3d4e',
          branch: 'release/1.3',
          startedAt: new Date(Date.now() - 86400000).toISOString(),
          completedAt: new Date(Date.now() - 86400000 + 120000).toISOString(),
          duration: 120,
          deployedBy: 'developer@example.com',
          changes: ['Update dependencies'],
          rollbackAvailable: true,
        },
        {
          id: 'deploy-3',
          environment: 'production',
          strategy: 'canary',
          status: 'failed',
          version: 'v1.2.6',
          commit: 'c3d4e5f',
          branch: 'main',
          startedAt: new Date(Date.now() - 172800000).toISOString(),
          completedAt: new Date(Date.now() - 172800000 + 180000).toISOString(),
          duration: 180,
          deployedBy: 'developer@example.com',
          error: 'Health check failed after deployment',
          rollbackAvailable: false,
        },
        {
          id: 'deploy-4',
          environment: 'development',
          strategy: 'standard',
          status: 'success',
          version: 'v1.3.0-dev.5',
          commit: 'd4e5f6g',
          branch: 'feature/user-profile',
          startedAt: new Date(Date.now() - 259200000).toISOString(),
          completedAt: new Date(Date.now() - 259200000 + 60000).toISOString(),
          duration: 60,
          deployedBy: 'developer@example.com',
          rollbackAvailable: true,
        },
        {
          id: 'deploy-5',
          environment: 'production',
          strategy: 'blue-green',
          status: 'success',
          version: 'v1.2.5',
          commit: 'e5f6g7h',
          branch: 'main',
          startedAt: new Date(Date.now() - 345600000).toISOString(),
          completedAt: new Date(Date.now() - 345600000 + 90000).toISOString(),
          duration: 90,
          deployedBy: 'admin@example.com',
          changes: ['Security patches', 'Performance improvements'],
          rollbackAvailable: true,
        },
      ]

      let filtered = mockDeployments
      if (filterEnv !== 'all') {
        filtered = filtered.filter((d) => d.environment === filterEnv)
      }
      if (filterStatus !== 'all') {
        filtered = filtered.filter((d) => d.status === filterStatus)
      }

      setDeployments(filtered)
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [filterEnv, filterStatus])

  useEffect(() => {
    fetchDeployments()
  }, [fetchDeployments])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'in_progress':
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
      case 'rolling_back':
        return <RotateCcw className="h-5 w-5 animate-spin text-yellow-500" />
      default:
        return <Clock className="h-5 w-5 text-zinc-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'rolling_back':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
    }
  }

  const getEnvColor = (env: string) => {
    switch (env) {
      case 'production':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'staging':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'development':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'local':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
    }
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
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
            href="/history"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-sky-400 dark:to-pink-300">
                Deployment History
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                View all past deployments and their status
              </p>
            </div>
            <button className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Rocket className="h-8 w-8 text-sky-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Deployments
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {deployments.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Successful
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {deployments.filter((d) => d.status === 'success').length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Failed
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {deployments.filter((d) => d.status === 'failed').length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Avg Duration
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {Math.round(
                    deployments.reduce((acc, d) => acc + (d.duration || 0), 0) /
                      deployments.length || 0,
                  )}
                  s
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Filters:
            </span>
          </div>
          <div className="relative">
            <select
              value={filterEnv}
              onChange={(e) =>
                setFilterEnv(e.target.value as Environment | 'all')
              }
              className="appearance-none rounded-lg border border-zinc-300 bg-white px-4 py-2 pr-10 text-sm text-zinc-900 capitalize focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              {environments.map((env) => (
                <option key={env} value={env}>
                  {env === 'all' ? 'All Environments' : env}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none rounded-lg border border-zinc-300 bg-white px-4 py-2 pr-10 text-sm text-zinc-900 capitalize focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="in_progress">In Progress</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>

        {/* Deployment List */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          {deployments.length === 0 ? (
            <div className="py-12 text-center">
              <Rocket className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
              <p className="text-zinc-600 dark:text-zinc-400">
                No deployments found matching your filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {getStatusIcon(deployment.status)}
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                            {deployment.version}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getEnvColor(deployment.environment)}`}
                          >
                            {deployment.environment}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusBadge(deployment.status)}`}
                          >
                            {deployment.status.replace('_', ' ')}
                          </span>
                          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                            {deployment.strategy}
                          </span>
                        </div>

                        <div className="mb-2 flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <GitCommit className="h-4 w-4" />
                            {deployment.commit}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-4 w-4" />
                            {deployment.branch}
                          </span>
                          {deployment.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {deployment.duration}s
                            </span>
                          )}
                        </div>

                        {deployment.changes &&
                          deployment.changes.length > 0 && (
                            <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                              Changes: {deployment.changes.join(', ')}
                            </p>
                          )}

                        {deployment.error && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Error: {deployment.error}
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>
                            {new Date(deployment.startedAt).toLocaleString()}
                          </span>
                          <span>{deployment.deployedBy}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {deployment.rollbackAvailable && (
                        <Link
                          href="/deploy/rollback"
                          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          title="Rollback to this version"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself deployments</span> - List
              deployment history
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself deployments --env=production
              </span>{' '}
              - Filter by environment
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself deploy show deploy-1
              </span>{' '}
              - Show deployment details
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself rollback --to=v1.2.5
              </span>{' '}
              - Rollback to version
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function DeploymentHistoryPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <DeploymentHistoryContent />
    </Suspense>
  )
}
