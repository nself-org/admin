'use client'

import { TableSkeleton } from '@/components/skeletons'
import type { GitHubPullRequest } from '@/types/github'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  GitMerge,
  GitPullRequest,
  RefreshCw,
  Search,
  Tag,
  User,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const stateConfig = {
  open: {
    label: 'Open',
    icon: GitPullRequest,
    className: 'bg-emerald-500/20 text-emerald-400',
  },
  closed: {
    label: 'Closed',
    icon: XCircle,
    className: 'bg-red-500/20 text-red-400',
  },
  merged: {
    label: 'Merged',
    icon: GitMerge,
    className: 'bg-sky-500/20 text-sky-400',
  },
}

function PRRow({ pr }: { pr: GitHubPullRequest }) {
  const state = stateConfig[pr.state]
  const StateIcon = state.icon

  return (
    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50">
      <td className="px-4 py-3">
        <div className="flex items-start gap-3">
          <StateIcon
            className="mt-1 h-4 w-4 text-zinc-400"
            style={{
              color:
                pr.state === 'open'
                  ? '#34d399'
                  : pr.state === 'merged'
                    ? '#a78bfa'
                    : '#f87171',
            }}
          />
          <div>
            <a
              href={pr.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-medium text-white hover:text-blue-400"
            >
              {pr.title}
              {pr.draft && (
                <span className="ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
                  Draft
                </span>
              )}
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
              <span>#{pr.number}</span>
              <span>by {pr.userLogin}</span>
              <span className="text-zinc-600">|</span>
              <span>
                {pr.head} → {pr.base}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${state.className}`}
        >
          <StateIcon className="h-3 w-3" />
          {state.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {pr.labels.slice(0, 2).map((label) => (
            <span
              key={label}
              className="flex items-center gap-1 rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-300"
            >
              <Tag className="h-3 w-3" />
              {label}
            </span>
          ))}
          {pr.labels.length > 2 && (
            <span className="text-xs text-zinc-500">
              +{pr.labels.length - 2}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {pr.reviewers.length > 0 ? (
          <div className="flex items-center gap-1">
            <User className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">
              {pr.reviewers.slice(0, 2).join(', ')}
              {pr.reviewers.length > 2 && ` +${pr.reviewers.length - 2}`}
            </span>
          </div>
        ) : (
          <span className="text-sm text-zinc-500">No reviewers</span>
        )}
      </td>
      <td className="px-4 py-3">
        {pr.mergeable === true && (
          <span className="flex items-center gap-1 text-sm text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            Ready
          </span>
        )}
        {pr.mergeable === false && (
          <span className="flex items-center gap-1 text-sm text-red-400">
            <XCircle className="h-4 w-4" />
            Conflicts
          </span>
        )}
        {pr.mergeable === undefined && pr.state === 'open' && (
          <span className="flex items-center gap-1 text-sm text-zinc-400">
            <Clock className="h-4 w-4" />
            Checking
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {pr.mergedAt
          ? `Merged ${new Date(pr.mergedAt).toLocaleDateString()}`
          : new Date(pr.updatedAt).toLocaleDateString()}
      </td>
    </tr>
  )
}

function GitHubPRsContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, error, isLoading, mutate } = useSWR<{
    prs: GitHubPullRequest[]
    total: number
  }>(
    `/api/plugins/github/prs?page=${page}&pageSize=${pageSize}&search=${searchQuery}&filter=${stateFilter}`,
    fetcher,
    { refreshInterval: 60000 },
  )

  const handleSync = async () => {
    await fetch('/api/plugins/github/sync', { method: 'POST' })
    mutate()
  }

  const prs = data?.prs || []
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
          <h1 className="text-2xl font-semibold text-white">Pull Requests</h1>
          <p className="text-sm text-zinc-400">Browse GitHub pull requests</p>
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
            <p className="text-red-400">Failed to load pull requests</p>
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
          <h1 className="text-2xl font-semibold text-white">Pull Requests</h1>
          <p className="text-sm text-zinc-400">
            {total.toLocaleString()} total pull requests
          </p>
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
            placeholder="Search pull requests..."
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
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
          >
            <option value="all">All States</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="merged">Merged</option>
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
                  Pull Request
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  State
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Labels
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Reviewers
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Mergeable
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {prs.length > 0 ? (
                prs.map((pr) => <PRRow key={pr.id} pr={pr} />)
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <GitPullRequest className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
                    <p className="text-zinc-400">No pull requests found</p>
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
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, total)} of {total}
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

export default function GitHubPRsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <GitHubPRsContent />
    </Suspense>
  )
}
