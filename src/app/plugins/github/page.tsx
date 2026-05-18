'use client'

import { CardGridSkeleton } from '@/components/skeletons'
import type { GitHubStats } from '@/types/github'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CheckCircle,
  Clock,
  Github,
  GitPullRequest,
  Play,
  RefreshCw,
  Star,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Metric Card Component
function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <div
      onMouseMove={onMouseMove}
      className="group relative rounded-2xl bg-zinc-50/90 p-6 transition-colors duration-300 hover:bg-zinc-100/80 dark:bg-white/5 dark:hover:bg-zinc-800/60"
    >
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-zinc-300 to-zinc-200 opacity-0 transition duration-300 group-hover:opacity-100 dark:from-zinc-600/40 dark:to-zinc-500/30"
        style={{
          maskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
          WebkitMaskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
        }}
      />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/10 transition-colors duration-300 ring-inset group-hover:ring-zinc-500/50 dark:ring-white/20 dark:group-hover:ring-zinc-400/60" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-500/20 transition-colors duration-300 group-hover:bg-zinc-500/40 dark:bg-zinc-400/20 dark:group-hover:bg-zinc-400/40">
            <Icon className="h-4 w-4 text-zinc-600 group-hover:text-zinc-500 dark:text-zinc-400 dark:group-hover:text-zinc-300" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</div>
        </div>
        {description && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        )}
      </div>
    </div>
  )
}

// Quick Link Card
function QuickLinkCard({
  title,
  description,
  href,
  icon: Icon,
  count,
}: {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 transition-all hover:border-zinc-500/50 hover:bg-zinc-800"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700/50">
          <Icon className="h-5 w-5 text-zinc-300" />
        </div>
        <div>
          <h3 className="font-medium text-white">{title}</h3>
          <p className="text-sm text-zinc-400">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {count !== undefined && (
          <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-sm text-zinc-300">
            {count.toLocaleString()}
          </span>
        )}
        <ArrowUpRight className="h-5 w-5 text-zinc-500 transition-colors group-hover:text-zinc-300" />
      </div>
    </Link>
  )
}

function GitHubDashboardContent() {
  const [syncing, setSyncing] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<{
    stats: GitHubStats
    counts: {
      repos: number
      issues: number
      prs: number
      workflows: number
    }
  }>('/api/plugins/github', fetcher, {
    refreshInterval: 60000,
  })

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch('/api/plugins/github/sync', { method: 'POST' })
      mutate()
    } finally {
      setSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/plugins"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Plugins
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">GitHub Dashboard</h1>
          <p className="text-sm text-zinc-400">Repository metrics and activity</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-zinc-800/50" />
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
            href="/plugins"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Plugins
          </Link>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">Failed to load GitHub data</p>
          </div>
        </div>
      </div>
    )
  }

  const stats = data?.stats
  const counts = data?.counts || { repos: 0, issues: 0, prs: 0, workflows: 0 }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/plugins"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plugins
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">GitHub Dashboard</h1>
          <p className="text-sm text-zinc-400">Repository metrics and activity</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-600 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Data'}
        </button>
      </div>

      {/* Repository Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Repositories"
          value={stats?.totalRepos || 0}
          description={`${stats?.publicRepos || 0} public, ${stats?.privateRepos || 0} private`}
          icon={BookOpen}
        />
        <MetricCard
          title="Open Issues"
          value={stats?.openIssues || 0}
          description="Across all repositories"
          icon={AlertCircle}
        />
        <MetricCard
          title="Open Pull Requests"
          value={stats?.openPRs || 0}
          description="Awaiting review"
          icon={GitPullRequest}
        />
        <MetricCard
          title="Total Stars"
          value={stats?.totalStars?.toLocaleString() || 0}
          description={`${stats?.totalForks?.toLocaleString() || 0} forks`}
          icon={Star}
        />
      </div>

      {/* Actions Stats */}
      {stats?.actionsRuns && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">Successful Runs</h3>
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="mt-2 text-3xl font-bold text-white">
              {stats.actionsRuns.success.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">Failed Runs</h3>
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <p className="mt-2 text-3xl font-bold text-white">
              {stats.actionsRuns.failure.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">Pending Runs</h3>
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            <p className="mt-2 text-3xl font-bold text-white">
              {stats.actionsRuns.pending.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Last Sync */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-zinc-400" />
            <span className="text-sm text-zinc-400">Last synced:</span>
            <span className="text-sm text-white">
              {stats?.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Quick Access</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <QuickLinkCard
            title="Repositories"
            description="Browse and manage repositories"
            href="/plugins/github/repos"
            icon={BookOpen}
            count={counts.repos}
          />
          <QuickLinkCard
            title="Issues"
            description="View open and closed issues"
            href="/plugins/github/issues"
            icon={AlertCircle}
            count={counts.issues}
          />
          <QuickLinkCard
            title="Pull Requests"
            description="Review pull requests"
            href="/plugins/github/prs"
            icon={GitPullRequest}
            count={counts.prs}
          />
          <QuickLinkCard
            title="Actions"
            description="Workflow runs and status"
            href="/plugins/github/actions"
            icon={Play}
            count={counts.workflows}
          />
        </div>
      </div>
    </div>
  )
}

export default function GitHubDashboardPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <GitHubDashboardContent />
    </Suspense>
  )
}
