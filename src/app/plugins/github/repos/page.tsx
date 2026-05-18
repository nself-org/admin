'use client'

import { TableSkeleton } from '@/components/skeletons'
import type { GitHubRepo } from '@/types/github'
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Circle,
  ExternalLink,
  GitFork,
  Globe,
  Lock,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Language colors (subset)
const languageColors: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#b07219',
  Ruby: '#701516',
  PHP: '#4F5D95',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  default: '#6e7681',
}

function RepoCard({ repo }: { repo: GitHubRepo }) {
  const langColor = languageColors[repo.language || 'default'] || languageColors.default

  return (
    <div className="group rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5 transition-all hover:border-zinc-500/50 hover:bg-zinc-800">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-zinc-400" />
          <div>
            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-medium text-white hover:text-blue-400"
            >
              {repo.name}
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100" />
            </a>
            <p className="text-xs text-zinc-500">{repo.fullName}</p>
          </div>
        </div>
        {repo.private ? (
          <Lock className="h-4 w-4 text-yellow-500" />
        ) : (
          <Globe className="h-4 w-4 text-zinc-500" />
        )}
      </div>

      {repo.description && (
        <p className="mb-3 line-clamp-2 text-sm text-zinc-400">{repo.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm">
        {repo.language && (
          <div className="flex items-center gap-1">
            <Circle className="h-3 w-3" style={{ fill: langColor, color: langColor }} />
            <span className="text-zinc-400">{repo.language}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-zinc-400">
          <Star className="h-4 w-4" />
          {repo.stargazersCount.toLocaleString()}
        </div>
        <div className="flex items-center gap-1 text-zinc-400">
          <GitFork className="h-4 w-4" />
          {repo.forksCount.toLocaleString()}
        </div>
        {repo.openIssuesCount > 0 && (
          <div className="flex items-center gap-1 text-zinc-400">
            <AlertCircle className="h-4 w-4" />
            {repo.openIssuesCount}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-zinc-700/50 pt-3">
        <span className="text-xs text-zinc-500">
          Updated {new Date(repo.updatedAt).toLocaleDateString()}
        </span>
        <span className="text-xs text-zinc-500">Default: {repo.defaultBranch}</span>
      </div>
    </div>
  )
}

function GitHubReposContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 12

  const { data, error, isLoading, mutate } = useSWR<{
    repos: GitHubRepo[]
    total: number
  }>(`/api/plugins/github/repos?page=${page}&pageSize=${pageSize}&search=${searchQuery}`, fetcher, {
    refreshInterval: 60000,
  })

  const handleSync = async () => {
    await fetch('/api/plugins/github/sync', { method: 'POST' })
    mutate()
  }

  const repos = data?.repos || []
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
          <h1 className="text-2xl font-semibold text-white">Repositories</h1>
          <p className="text-sm text-zinc-400">Browse GitHub repositories</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-zinc-800/50" />
          ))}
        </div>
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
            <p className="text-red-400">Failed to load repositories</p>
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
          <h1 className="text-2xl font-semibold text-white">Repositories</h1>
          <p className="text-sm text-zinc-400">{total.toLocaleString()} total repositories</p>
        </div>
        <button
          onClick={handleSync}
          className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-600"
        >
          <RefreshCw className="h-4 w-4" />
          Sync
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(1)
          }}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none"
        />
      </div>

      {/* Repos Grid */}
      {repos.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <BookOpen className="mb-4 h-12 w-12 text-zinc-600" />
          <p className="text-zinc-400">No repositories found</p>
        </div>
      )}

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

export default function GitHubReposPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <GitHubReposContent />
    </Suspense>
  )
}
