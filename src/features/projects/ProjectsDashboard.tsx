'use client'

import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  FolderOpen,
  Loader2,
  RefreshCw,
  Server,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type {
  ProjectHealthStatus,
  ProjectsDashboardResponse,
  ProjectSummary,
} from './types'

interface HealthConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  badgeClass: string
}

const HEALTH_CONFIG: Record<ProjectHealthStatus, HealthConfig> = {
  healthy: {
    label: 'Healthy',
    icon: CheckCircle2,
    badgeClass: 'border-green-500/40 text-green-400 bg-green-500/10',
  },
  degraded: {
    label: 'Degraded',
    icon: AlertTriangle,
    badgeClass: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  },
  down: {
    label: 'Down',
    icon: XCircle,
    badgeClass: 'border-red-500/40 text-red-400 bg-red-500/10',
  },
  unknown: {
    label: 'Unknown',
    icon: CircleHelp,
    badgeClass: 'border-zinc-500/40 text-zinc-400 bg-zinc-500/10',
  },
}

function SummaryCard({ summary }: { summary: ProjectSummary }) {
  const cfg = HEALTH_CONFIG[summary.health]
  const Icon = cfg.icon
  const { project } = summary
  const servicesLabel =
    summary.totalServices > 0
      ? `${summary.runningServices}/${summary.totalServices} services`
      : 'No stack built'

  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <FolderOpen className="text-nself-primary h-4 w-4 flex-shrink-0" />
        <span
          className="text-nself-text flex-1 truncate text-sm font-semibold"
          title={project.path}
        >
          {project.name}
        </span>
        <span
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.badgeClass}`}
        >
          <Icon className="h-3 w-3" />
          {cfg.label}
        </span>
      </div>

      <p
        className="text-nself-text-muted mb-3 truncate font-mono text-xs"
        title={project.path}
      >
        {project.path}
      </p>

      <div className="text-nself-text-muted flex items-center gap-2 text-xs">
        <Server className="h-3.5 w-3.5" />
        <span>{servicesLabel}</span>
        <span className="ml-auto tracking-wide uppercase">
          {project.activeEnv}
        </span>
      </div>

      {summary.errorMessage !== null && (
        <p className="mt-2 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">
          {summary.errorMessage}
        </p>
      )}
    </div>
  )
}

export function ProjectsDashboard() {
  const [data, setData] = useState<ProjectsDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/projects/summary', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }
      const json = (await res.json()) as ProjectsDashboardResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const summaries = data?.summaries ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">
            Projects Dashboard
          </h1>
          <p className="text-nself-text-muted text-xs">
            Cross-project health and resource snapshot
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {error !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {loading && data === null ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-nself-primary h-5 w-5 animate-spin" />
        </div>
      ) : summaries.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <FolderOpen className="text-nself-text-muted mx-auto mb-2 h-6 w-6" />
          <p className="text-nself-text-muted text-sm">
            No projects registered yet. Use the project picker to add one.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => (
            <SummaryCard key={summary.project.id} summary={summary} />
          ))}
        </div>
      )}
    </div>
  )
}
