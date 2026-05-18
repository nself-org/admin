'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { ListSkeleton } from '@/components/skeletons'
import { useUrlState } from '@/hooks/useUrlState'
import {
  AlertCircle,
  Archive,
  CheckCircle,
  Clock,
  Download,
  Edit3,
  HardDrive,
  Info,
  Loader2,
  MoreVertical,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  Search,
  Shield,
  Timer,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useState } from 'react'
import useSWR from 'swr'

interface Backup {
  id: string
  name: string
  type: 'full' | 'incremental' | 'differential'
  status: 'running' | 'completed' | 'failed' | 'scheduled'
  progress?: number
  size: number
  created: string
  duration?: number
  databases: string[]
  retentionDays: number
  location: string
  compression: boolean
  encryption: boolean
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string
    enabled: boolean
  }
}

interface BackupJob {
  id: string
  name: string
  type: 'full' | 'incremental' | 'differential'
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string
    enabled: boolean
  }
  targets: string[]
  retentionDays: number
  compression: boolean
  encryption: boolean
  lastRun?: string
  nextRun: string
  status: 'active' | 'paused' | 'error'
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function formatSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function BackupCard({
  backup,
  onAction,
}: {
  backup: Backup
  onAction: (action: string, id: string) => void
}) {
  const statusConfig = {
    running: {
      icon: Loader2,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
    },
    completed: {
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
    },
    failed: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
    },
    scheduled: {
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
    },
  }

  const config = statusConfig[backup.status]
  const StatusIcon = config.icon

  const typeConfig = {
    full: {
      label: 'Full',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    },
    incremental: {
      label: 'Incremental',
      color:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    },
    differential: {
      label: 'Differential',
      color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    },
  }

  return (
    <div
      className={`rounded-lg border ${config.border} bg-white p-6 shadow-sm dark:bg-zinc-800`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${config.bg}`}>
            <StatusIcon
              className={`h-5 w-5 ${config.color} ${backup.status === 'running' ? 'animate-spin' : ''}`}
            />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              {backup.name}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${typeConfig[backup.type].color}`}
              >
                {typeConfig[backup.type].label}
              </span>
              {backup.encryption && (
                <Shield className="h-3 w-3 text-zinc-500" />
              )}
              {backup.compression && (
                <Archive className="h-3 w-3 text-zinc-500" />
              )}
            </div>
          </div>
        </div>

        <div className="group relative">
          <button className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700">
            <MoreVertical className="h-4 w-4" />
          </button>
          <div className="invisible absolute right-0 z-10 mt-1 w-48 rounded-lg border border-zinc-200 bg-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-800">
            <button
              onClick={() => onAction('download', backup.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={() => onAction('restore', backup.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              <RotateCw className="h-4 w-4" />
              Restore
            </button>
            <button
              onClick={() => onAction('info', backup.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              <Info className="h-4 w-4" />
              Details
            </button>
            <hr className="my-1 border-zinc-200 dark:border-zinc-700" />
            <button
              onClick={() => onAction('delete', backup.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">Size</span>
            <p className="font-medium">{formatSize(backup.size)}</p>
          </div>
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">Created</span>
            <p className="font-medium">{formatDate(backup.created)}</p>
          </div>
        </div>

        {backup.status === 'running' && backup.progress && (
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Progress</span>
              <span className="font-medium">{backup.progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all"
                style={{ width: `${backup.progress}%` }}
              />
            </div>
          </div>
        )}

        {backup.duration && (
          <div className="text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Duration: </span>
            <span className="font-medium">
              {formatDuration(backup.duration)}
            </span>
          </div>
        )}

        <div className="text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Databases: </span>
          <span className="font-medium">{backup.databases.join(', ')}</span>
        </div>

        <div className="text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Retention: </span>
          <span className="font-medium">{backup.retentionDays} days</span>
        </div>

        {backup.schedule && (
          <div className="text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Schedule: </span>
            <span className="font-medium">
              {backup.schedule.frequency} at {backup.schedule.time}
              {backup.schedule.enabled ? ' (active)' : ' (paused)'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function JobCard({
  job,
  onAction,
}: {
  job: BackupJob
  onAction: (action: string, id: string) => void
}) {
  const statusConfig = {
    active: {
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
    },
    paused: {
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
    },
    error: {
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
    },
  }

  const config = statusConfig[job.status]

  return (
    <div
      className={`rounded-lg border ${config.border} bg-white p-6 shadow-sm dark:bg-zinc-800`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${config.bg}`}>
            <Timer className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              {job.name}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                {job.type}
              </span>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${config.bg} ${config.color}`}
              >
                {job.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              onAction(job.status === 'active' ? 'pause' : 'resume', job.id)
            }
            className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            title={job.status === 'active' ? 'Pause' : 'Resume'}
          >
            {job.status === 'active' ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => onAction('run', job.id)}
            className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            <Zap className="h-4 w-4" />
          </button>
          <button
            onClick={() => onAction('edit', job.id)}
            className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Schedule: </span>
          <span className="font-medium">
            {job.schedule.frequency} at {job.schedule.time}
          </span>
        </div>

        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Targets: </span>
          <span className="font-medium">{job.targets.join(', ')}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">Last Run</span>
            <p className="font-medium">
              {job.lastRun ? formatDate(job.lastRun) : 'Never'}
            </p>
          </div>
          <div>
            <span className="text-zinc-500 dark:text-zinc-400">Next Run</span>
            <p className="font-medium">{formatDate(job.nextRun)}</p>
          </div>
        </div>

        <div>
          <span className="text-zinc-500 dark:text-zinc-400">Retention: </span>
          <span className="font-medium">{job.retentionDays} days</span>
        </div>
      </div>
    </div>
  )
}

function BackupsContent() {
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'backups')
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data,
    error,
    mutate,
  } = useSWR<{ backups: Backup[]; jobs: BackupJob[] }>('/api/backup', fetcher)

  const backups = data?.backups ?? []
  const jobs = data?.jobs ?? []

  const handleBackupAction = useCallback(async (action: string, id: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/backup/${encodeURIComponent(id)}`, {
        method: action === 'delete' ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: action !== 'delete' ? JSON.stringify({ action }) : undefined,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await mutate()
    } finally {
      setActionLoading(false)
    }
  }, [mutate])

  const handleJobAction = useCallback(async (action: string, id: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/backup/jobs/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await mutate()
    } finally {
      setActionLoading(false)
    }
  }, [mutate])

  const filteredBackups = backups.filter((backup) => {
    if (filter !== 'all' && backup.status !== filter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        backup.name.toLowerCase().includes(query) ||
        backup.databases.some((db) => db.toLowerCase().includes(query))
      )
    }
    return true
  })

  const stats = {
    total: backups.length,
    completed: backups.filter((b) => b.status === 'completed').length,
    running: backups.filter((b) => b.status === 'running').length,
    failed: backups.filter((b) => b.status === 'failed').length,
    totalSize: backups.reduce((acc, b) => acc + b.size, 0),
    activeJobs: jobs.filter((j) => j.status === 'active').length,
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/operations" className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700">
            <AlertCircle className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold text-white">Backup Manager</h1>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">
              {error instanceof Error ? error.message : 'Failed to load backup data'}
            </p>
          </div>
          <button
            onClick={() => mutate()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                Backup Manager
              </h1>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Manage database backups, schedules, and restore points
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="filled" className="flex items-center gap-2" disabled={actionLoading}>
                <Save className="h-4 w-4" />
                Create Backup
              </Button>
              <Button
                onClick={() => mutate()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Total
                  </p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Archive className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Completed
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.completed}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Running
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.running}
                  </p>
                </div>
                <Loader2 className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Failed
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.failed}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Total Size
                  </p>
                  <p className="text-lg font-bold">
                    {formatSize(stats.totalSize)}
                  </p>
                </div>
                <HardDrive className="h-8 w-8 text-sky-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Active Jobs
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.activeJobs}
                  </p>
                </div>
                <Timer className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-zinc-200 dark:border-zinc-700">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('backups')}
                className={`border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === 'backups'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                Backups ({backups.length})
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === 'jobs'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                Scheduled Jobs ({jobs.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative max-w-md flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search backups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white py-2 pr-4 pl-10 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>

              {activeTab === 'backups' && (
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="running">Running</option>
                  <option value="failed">Failed</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'backups' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {filteredBackups.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-800">
                <Archive className="mb-4 h-12 w-12 text-zinc-400" />
                <p className="text-zinc-500">No backups found</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Create a backup to get started
                </p>
              </div>
            ) : (
              filteredBackups.map((backup) => (
                <BackupCard
                  key={backup.id}
                  backup={backup}
                  onAction={handleBackupAction}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Scheduled Backup Jobs
              </h2>
              <Button variant="filled" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Job
              </Button>
            </div>

            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-800">
                <Timer className="mb-4 h-12 w-12 text-zinc-400" />
                <p className="text-zinc-500">No scheduled jobs</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Create a job to automate backups
                </p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} onAction={handleJobAction} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-4xl">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
              <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-white">
                Backup Settings
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Default Storage Location
                  </label>
                  <input
                    type="text"
                    defaultValue="/var/lib/nself/backups"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Default Retention Period (days)
                  </label>
                  <input
                    type="number"
                    defaultValue={30}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="compression"
                      defaultChecked
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600"
                    />
                    <label
                      htmlFor="compression"
                      className="ml-2 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      Enable compression by default
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="encryption"
                      defaultChecked
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600"
                    />
                    <label
                      htmlFor="encryption"
                      className="ml-2 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      Enable encryption by default
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Notification Email
                  </label>
                  <input
                    type="email"
                    placeholder="admin@example.com"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notifications"
                    defaultChecked
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600"
                  />
                  <label
                    htmlFor="notifications"
                    className="ml-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    Send email notifications for backup failures
                  </label>
                </div>

                <div className="pt-4">
                  <Button variant="filled">Save Settings</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function BackupsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <BackupsContent />
    </Suspense>
  )
}
