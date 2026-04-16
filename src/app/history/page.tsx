'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { TableSkeleton } from '@/components/skeletons'
import type { HistoryEntry } from '@/types/deployment'
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Download,
  Filter,
  RefreshCw,
  Rocket,
  Server,
  Settings,
  Shield,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

function HistoryContent() {
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [filterUser, setFilterUser] = useState<string>('all')

  const actionTypes = [
    'all',
    'deployment',
    'config_change',
    'database',
    'service',
    'security',
    'sync',
  ]

  const fetchHistory = useCallback(async () => {
    try {
      // Mock data - replace with real API
      const mockHistory: HistoryEntry[] = [
        {
          id: 'hist-1',
          type: 'deployment',
          action: 'deploy',
          description: 'Deployed v1.3.0 to production',
          user: 'developer@example.com',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          metadata: { version: 'v1.3.0', environment: 'production' },
        },
        {
          id: 'hist-2',
          type: 'config_change',
          action: 'update',
          description: 'Updated LOG_LEVEL to debug',
          user: 'developer@example.com',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          metadata: { key: 'LOG_LEVEL', oldValue: 'info', newValue: 'debug' },
        },
        {
          id: 'hist-3',
          type: 'database',
          action: 'migrate',
          description: 'Applied migration: add_user_preferences',
          user: 'admin@example.com',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          metadata: { migration: 'add_user_preferences' },
        },
        {
          id: 'hist-4',
          type: 'service',
          action: 'restart',
          description: 'Restarted hasura service',
          user: 'developer@example.com',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          metadata: { service: 'hasura' },
        },
        {
          id: 'hist-5',
          type: 'security',
          action: 'rotate',
          description: 'Rotated API keys for production',
          user: 'admin@example.com',
          timestamp: new Date(Date.now() - 259200000).toISOString(),
          metadata: { keys: ['API_KEY', 'JWT_SECRET'] },
        },
        {
          id: 'hist-6',
          type: 'sync',
          action: 'sync',
          description: 'Synced staging to production',
          user: 'developer@example.com',
          timestamp: new Date(Date.now() - 345600000).toISOString(),
          metadata: { source: 'staging', target: 'production' },
        },
        {
          id: 'hist-7',
          type: 'deployment',
          action: 'rollback',
          description: 'Rolled back production to v1.2.5',
          user: 'admin@example.com',
          timestamp: new Date(Date.now() - 432000000).toISOString(),
          metadata: { fromVersion: 'v1.2.6', toVersion: 'v1.2.5' },
        },
        {
          id: 'hist-8',
          type: 'database',
          action: 'backup',
          description: 'Created database backup',
          user: 'system',
          timestamp: new Date(Date.now() - 518400000).toISOString(),
          metadata: { size: '2.5GB', file: 'backup-2024-01-20.sql' },
        },
      ]

      let filtered = mockHistory
      if (filterType !== 'all') {
        filtered = filtered.filter((h) => h.type === filterType)
      }
      if (filterUser !== 'all') {
        filtered = filtered.filter((h) => h.user === filterUser)
      }

      setHistory(filtered)
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [filterType, filterUser])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deployment':
        return <Rocket className="h-5 w-5 text-sky-500" />
      case 'config_change':
        return <Settings className="h-5 w-5 text-blue-500" />
      case 'database':
        return <Database className="h-5 w-5 text-green-500" />
      case 'service':
        return <Server className="h-5 w-5 text-orange-500" />
      case 'security':
        return <Shield className="h-5 w-5 text-red-500" />
      case 'sync':
        return <RefreshCw className="h-5 w-5 text-teal-500" />
      default:
        return <Activity className="h-5 w-5 text-zinc-500" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'deployment':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
      case 'config_change':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'database':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'service':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      case 'security':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'sync':
        return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-indigo-400 dark:to-violet-300">
                Audit History
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Track all system changes and operations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Link
            href="/history/deployments"
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-sky-500 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-sky-500"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <Rocket className="h-5 w-5 text-sky-500 dark:text-sky-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  Deployments
                </p>
                <p className="text-sm text-zinc-500">Deployment history</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-400" />
          </Link>

          <Link
            href="/history/migrations"
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-green-500 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-green-500"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  Migrations
                </p>
                <p className="text-sm text-zinc-500">Database changes</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-400" />
          </Link>

          <Link
            href="/sync/history"
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-teal-500 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-teal-500"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
                <RefreshCw className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  Sync History
                </p>
                <p className="text-sm text-zinc-500">Environment syncs</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-400" />
          </Link>
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
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none rounded-lg border border-zinc-300 bg-white px-4 py-2 pr-10 text-sm text-zinc-900 capitalize focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              {actionTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'all'
                    ? 'All Types'
                    : type
                        .replace('_', ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>
          <div className="relative">
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="appearance-none rounded-lg border border-zinc-300 bg-white px-4 py-2 pr-10 text-sm text-zinc-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="all">All Users</option>
              <option value="developer@example.com">
                developer@example.com
              </option>
              <option value="admin@example.com">admin@example.com</option>
              <option value="system">System</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>

        {/* History Timeline */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          {history.length === 0 ? (
            <div className="py-12 text-center">
              <Clock className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
              <p className="text-zinc-600 dark:text-zinc-400">
                No history entries found matching your filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                >
                  <div className="flex items-start gap-4">
                    {getTypeIcon(entry.type)}
                    <div className="flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getTypeBadge(entry.type)}`}
                        >
                          {entry.type.replace('_', ' ')}
                        </span>
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 uppercase dark:bg-zinc-700 dark:text-zinc-400">
                          {entry.action}
                        </span>
                      </div>
                      <p className="text-zinc-900 dark:text-white">
                        {entry.description}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {entry.user}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(entry.timestamp || '')}
                        </span>
                        <span className="text-zinc-400">
                          {entry.timestamp
                            ? new Date(entry.timestamp).toLocaleString()
                            : ''}
                        </span>
                      </div>
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
              <span className="text-sky-500">nself history</span> - View
              audit history
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself history --type=deployment
              </span>{' '}
              - Filter by type
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself history --since=7d</span>{' '}
              - Show last 7 days
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself history --export=csv
              </span>{' '}
              - Export history
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <HistoryContent />
    </Suspense>
  )
}
