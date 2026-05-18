'use client'

import { TableSkeleton } from '@/components/skeletons'
import type { GitHubWorkflowRun } from '@/types/github'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  GitBranch,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  StopCircle,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const statusConfig = {
  queued: {
    label: 'Queued',
    icon: Clock,
    className: 'bg-yellow-500/20 text-yellow-400',
  },
  in_progress: {
    label: 'In Progress',
    icon: RotateCcw,
    className: 'bg-blue-500/20 text-blue-400 animate-pulse',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    className: 'bg-emerald-500/20 text-emerald-400',
  },
  waiting: {
    label: 'Waiting',
    icon: Clock,
    className: 'bg-zinc-500/20 text-zinc-400',
  },
}

const conclusionConfig = {
  success: {
    label: 'Success',
    icon: CheckCircle,
    className: 'bg-emerald-500/20 text-emerald-400',
  },
  failure: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-500/20 text-red-400',
  },
  cancelled: {
    label: 'Cancelled',
    icon: StopCircle,
    className: 'bg-zinc-500/20 text-zinc-400',
  },
  skipped: {
    label: 'Skipped',
    icon: Clock,
    className: 'bg-zinc-500/20 text-zinc-400',
  },
  timed_out: {
    label: 'Timed Out',
    icon: Clock,
    className: 'bg-orange-500/20 text-orange-400',
  },
  action_required: {
    label: 'Action Required',
    icon: AlertCircle,
    className: 'bg-yellow-500/20 text-yellow-400',
  },
}

function WorkflowRunRow({ run }: { run: GitHubWorkflowRun }) {
  const status =
    run.status === 'completed' && run.conclusion
      ? conclusionConfig[run.conclusion]
      : statusConfig[run.status]
  const StatusIcon = status?.icon || Clock

  return (
    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50">
      <td className="px-4 py-3">
        <div className="flex items-start gap-3">
          <StatusIcon
            className={`mt-1 h-4 w-4 ${run.status === 'in_progress' ? 'animate-spin' : ''}`}
            style={{
              color:
                run.conclusion === 'success'
                  ? '#34d399'
                  : run.conclusion === 'failure'
                    ? '#f87171'
                    : run.status === 'in_progress'
                      ? '#60a5fa'
                      : '#a1a1aa',
            }}
          />
          <div>
            <a
              href={run.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-medium text-white hover:text-blue-400"
            >
              {run.name}
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
              <span>#{run.runNumber}</span>
              <span className="text-zinc-600">|</span>
              <span>{run.event}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${status?.className || 'bg-zinc-500/20 text-zinc-400'}`}
        >
          <StatusIcon className="h-3 w-3" />
          {status?.label || run.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-sm text-zinc-400">
          <GitBranch className="h-4 w-4 text-zinc-500" />
          {run.headBranch}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-zinc-500">{run.headSha.substring(0, 7)}</span>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {new Date(run.createdAt).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <a
          href={run.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      </td>
    </tr>
  )
}

function GitHubActionsContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, error, isLoading, mutate } = useSWR<{
    runs: GitHubWorkflowRun[]
    total: number
  }>(
    `/api/plugins/github/actions?page=${page}&pageSize=${pageSize}&filter=${statusFilter}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const handleSync = async () => {
    await fetch('/api/plugins/github/sync', { method: 'POST' })
    mutate()
  }

  const runs = data?.runs || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/plugins/github"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to GitHub Dashboard
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Actions</h1>
          <p className="text-sm text-zinc-400">Workflow runs and status</p>
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-zinc-800/50" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/plugins/github"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to GitHub Dashboard
          </Link>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">Failed to load workflow runs</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/plugins/github"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to GitHub Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Actions</h1>
          <p className="text-sm text-zinc-400">{total.toLocaleString()} total workflow runs</p>
        </div>
        <button
          onClick={handleSync}
          className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-600"
        >
          <RefreshCw className="h-4 w-4" />
          Sync
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="success">Success</option>
            <option value="failure">Failed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Workflow
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Branch
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Commit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Started
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.length > 0 ? (
                runs.map((run) => <WorkflowRunRow key={run.id} run={run} />)
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Play className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
                    <p className="text-zinc-400">No workflow runs found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="px-3 text-sm text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GitHubActionsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <GitHubActionsContent />
    </Suspense>
  )
}
