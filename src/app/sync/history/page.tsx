'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { TableSkeleton } from '@/components/skeletons'
import type { Environment, SyncOperation } from '@/types/deployment'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Clock,
  Download,
  Eye,
  Filter,
  RefreshCw,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function SyncHistoryContent() {
  const [filterEnv, setFilterEnv] = useState<Environment | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed' | 'in_progress'>(
    'all'
  )

  const environments: (Environment | 'all')[] = [
    'all',
    'local',
    'development',
    'staging',
    'production',
  ]

  const { data, error, isLoading } = useSWR<{
    success: boolean
    history: SyncOperation[]
    total: number
  }>('/api/sync/history', fetcher)

  const allHistory = data?.history ?? []
  let syncHistory = allHistory
  if (filterEnv !== 'all') {
    syncHistory = syncHistory.filter((s) => s.source === filterEnv || s.target === filterEnv)
  }
  if (filterStatus !== 'all') {
    syncHistory = syncHistory.filter((s) => s.status === filterStatus)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'in_progress':
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
      default:
        return <Clock className="h-5 w-5 text-zinc-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
    }
  }

  if (error) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-400">
                {error instanceof Error ? error.message : 'Failed to load sync history'}
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
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
            href="/sync"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sync
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-teal-600 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent dark:from-teal-400 dark:to-cyan-300">
                Sync History
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                View all environment synchronization operations
              </p>
            </div>
            <button className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Filters:</span>
          </div>
          <div className="relative">
            <select
              value={filterEnv}
              onChange={(e) => setFilterEnv(e.target.value as Environment | 'all')}
              className="appearance-none rounded-lg border border-zinc-300 bg-white px-4 py-2 pr-10 text-sm text-zinc-900 capitalize focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
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
              onChange={(e) =>
                setFilterStatus(e.target.value as 'all' | 'completed' | 'failed' | 'in_progress')
              }
              className="appearance-none rounded-lg border border-zinc-300 bg-white px-4 py-2 pr-10 text-sm text-zinc-900 capitalize focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="in_progress">In Progress</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>

        {/* History List */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          {syncHistory.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
              <p className="text-zinc-600 dark:text-zinc-400">
                No sync operations found matching your filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {syncHistory.map((sync) => (
                <div key={sync.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {getStatusIcon(sync.status)}
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded bg-zinc-100 px-2 py-0.5 text-sm font-medium text-zinc-700 capitalize dark:bg-zinc-700 dark:text-zinc-300">
                            {sync.source}
                          </span>
                          <ArrowRight className="h-4 w-4 text-zinc-400" />
                          <span className="rounded bg-zinc-100 px-2 py-0.5 text-sm font-medium text-zinc-700 capitalize dark:bg-zinc-700 dark:text-zinc-300">
                            {sync.target}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusBadge(sync.status)}`}
                          >
                            {sync.status.replace('_', ' ')}
                          </span>
                        </div>
                        {sync.changes && (
                          <div className="mb-1 flex gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                            <span>{sync.changes.variables} variables</span>
                            <span>{sync.changes.secrets} secrets</span>
                            <span>{sync.changes.services} services</span>
                          </div>
                        )}
                        {sync.error && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Error: {sync.error}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(sync.startedAt).toLocaleString()}
                          </span>
                          {sync.completedAt && (
                            <span>
                              Duration:{' '}
                              {Math.round(
                                (new Date(sync.completedAt).getTime() -
                                  new Date(sync.startedAt).getTime()) /
                                  1000
                              )}
                              s
                            </span>
                          )}
                          <span>{sync.syncedBy}</span>
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
                      {sync.status === 'completed' && (
                        <button
                          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          title="Revert sync"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
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
              <span className="text-teal-500">nself sync --history</span> - View sync history
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-teal-500">nself sync --history --env=staging</span> - Filter by
              environment
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-teal-500">nself sync revert sync-1</span> - Revert a sync
              operation
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function SyncHistoryPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <SyncHistoryContent />
    </Suspense>
  )
}
