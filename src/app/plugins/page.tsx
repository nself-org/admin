'use client'

import { CardGridSkeleton } from '@/components/skeletons'
import type { Plugin, PluginSyncStatus } from '@/types/plugins'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  ArrowUpCircle,
  CheckCircle,
  Clock,
  CreditCard,
  Github,
  Plug,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Plugin icon mapping
const pluginIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  stripe: CreditCard,
  shopify: ShoppingCart,
  github: Github,
  default: Plug,
}

function getPluginIcon(name: string) {
  const lowerName = name.toLowerCase()
  for (const [key, Icon] of Object.entries(pluginIcons)) {
    if (lowerName.includes(key)) return Icon
  }
  return pluginIcons.default
}

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

  function onMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <div
      onMouseMove={onMouseMove}
      className="group relative rounded-2xl bg-zinc-50/90 p-6 transition-colors duration-300 hover:bg-emerald-50/80 dark:bg-white/5 dark:hover:bg-emerald-950/40"
    >
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-200 to-emerald-100 opacity-0 transition duration-300 group-hover:opacity-100 dark:from-emerald-500/40 dark:to-emerald-400/30"
        style={{
          maskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
          WebkitMaskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
        }}
      />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/10 transition-colors duration-300 ring-inset group-hover:ring-emerald-500/50 dark:ring-white/20 dark:group-hover:ring-emerald-400/60" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {title}
          </h3>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 transition-colors duration-300 group-hover:bg-emerald-500/40 dark:bg-emerald-400/20 dark:group-hover:bg-emerald-400/40">
            <Icon className="h-4 w-4 text-emerald-600 group-hover:text-emerald-500 dark:text-emerald-400 dark:group-hover:text-emerald-300" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {value}
          </div>
        </div>
        {description && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

// Plugin Card Component
function PluginCard({
  plugin,
  syncStatus,
  onSync,
  onDisable,
  onRemove,
}: {
  plugin: Plugin
  syncStatus?: PluginSyncStatus
  onSync: (name: string) => void
  onDisable: (name: string) => void
  onRemove: (name: string) => void
}) {
  const [showActions, setShowActions] = useState(false)
  const Icon = getPluginIcon(plugin.name)
  const isActive = plugin.status === 'installed'
  const isSyncing = syncStatus?.status === 'syncing'
  const hasUpdate = plugin.status === 'update_available'

  const statusColors = {
    installed: 'bg-emerald-500/20 text-emerald-400',
    available: 'bg-zinc-600/20 text-zinc-400',
    update_available: 'bg-yellow-500/20 text-yellow-400',
    installing: 'bg-blue-500/20 text-blue-400',
    error: 'bg-red-500/20 text-red-400',
  }

  const statusLabels = {
    installed: 'Active',
    available: 'Available',
    update_available: 'Update Available',
    installing: 'Installing...',
    error: 'Error',
  }

  return (
    <div className="group rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5 transition-all hover:border-emerald-500/50 hover:bg-zinc-800">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700/50">
            <Icon className="h-5 w-5 text-zinc-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white capitalize">
                {plugin.name}
              </h3>
              {hasUpdate && (
                <span className="rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-400">
                  Update
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">v{plugin.version}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${statusColors[plugin.status]}`}
          >
            {statusLabels[plugin.status]}
          </span>
          {isActive && (
            <button
              onClick={() => setShowActions(!showActions)}
              className="text-zinc-400 hover:text-white"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <p className="mb-4 line-clamp-2 text-sm text-zinc-400">
        {plugin.description}
      </p>

      {isActive && syncStatus && (
        <div className="mb-4 rounded-lg bg-zinc-900/50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Last sync</span>
            <span className="text-zinc-400">
              {syncStatus.lastSync
                ? new Date(syncStatus.lastSync).toLocaleString()
                : 'Never'}
            </span>
          </div>
          {syncStatus.recordsTotal > 0 && (
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Records</span>
              <span className="text-zinc-400">
                {syncStatus.recordsTotal.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {showActions && isActive && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg bg-zinc-900/50 p-3">
          <button
            onClick={() => {
              onDisable(plugin.name)
              setShowActions(false)
            }}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-yellow-400"
          >
            <AlertCircle className="h-4 w-4" />
            Disable Plugin
          </button>
          <button
            onClick={() => {
              if (confirm(`Remove ${plugin.name}? This cannot be undone.`)) {
                onRemove(plugin.name)
                setShowActions(false)
              }
            }}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-red-400"
          >
            <Zap className="h-4 w-4" />
            Remove Plugin
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {isActive ? (
          <>
            <Link
              href={`/plugins/${plugin.name}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-700/50 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              <Settings className="h-4 w-4" />
              Configure
            </Link>
            <button
              onClick={() => onSync(plugin.name)}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600/20 px-3 py-2 text-sm text-emerald-400 transition-colors hover:bg-emerald-600/30 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
              />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </button>
          </>
        ) : (
          <Link
            href={`/plugins/marketplace?install=${plugin.name}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white transition-colors hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Install
          </Link>
        )}
      </div>
    </div>
  )
}

function PluginsContent() {
  const searchParams = useSearchParams()
  const urlFilter = searchParams.get('filter')

  const [_syncing, setSyncing] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'updates'>(
    urlFilter === 'updates' ? 'updates' : 'all',
  )
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date')

  const { data, error, isLoading, mutate } = useSWR<{
    plugins: Plugin[]
    syncStatuses: PluginSyncStatus[]
  }>('/api/plugins', fetcher, {
    refreshInterval: 30000,
  })

  const handleSync = async (pluginName: string) => {
    setSyncing(pluginName)
    try {
      await fetch(`/api/plugins/${pluginName}/sync`, { method: 'POST' })
      mutate()
    } finally {
      setSyncing(null)
    }
  }

  const handleDisable = async (pluginName: string) => {
    try {
      await fetch(`/api/plugins/${pluginName}/disable`, { method: 'POST' })
      mutate()
    } catch (_error) {
      alert('Failed to disable plugin')
    }
  }

  const handleRemove = async (pluginName: string) => {
    try {
      await fetch(`/api/plugins/${pluginName}`, { method: 'DELETE' })
      mutate()
    } catch (_error) {
      alert('Failed to remove plugin')
    }
  }

  let plugins = data?.plugins || []
  const syncStatuses = data?.syncStatuses || []

  // Apply filters
  if (searchQuery) {
    plugins = plugins.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }

  if (filterActive === 'active') {
    plugins = plugins.filter((p) => p.status === 'installed')
  }

  if (filterActive === 'updates') {
    plugins = plugins.filter((p) => p.status === 'update_available')
  }

  // Apply sorting
  plugins = [...plugins].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name)
    } else {
      // Sort by installedAt date
      const dateA = a.installedAt ? new Date(a.installedAt).getTime() : 0
      const dateB = b.installedAt ? new Date(b.installedAt).getTime() : 0
      return dateB - dateA
    }
  })

  const installedCount = (data?.plugins || []).filter(
    (p) => p.status === 'installed',
  ).length
  const activeCount = plugins.filter(
    (p) =>
      p.status === 'installed' &&
      syncStatuses.find((s) => s.pluginName === p.name)?.status !== 'error',
  ).length
  const totalRecords = syncStatuses.reduce(
    (acc, s) => acc + (s.recordsTotal || 0),
    0,
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Plugins</h1>
            <p className="text-sm text-zinc-400">
              Manage third-party integrations
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg bg-zinc-800/50"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Plugins</h1>
            <p className="text-sm text-zinc-400">
              Manage third-party integrations
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">Failed to load plugins</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Plugins</h1>
          <p className="text-sm text-zinc-400">
            Manage third-party integrations
          </p>
        </div>
        <Link
          href="/plugins/marketplace"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" /> Install Plugin
        </Link>
      </div>

      {/* Search and Filters */}
      {(data?.plugins || []).length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterActive}
              onChange={(e) =>
                setFilterActive(e.target.value as 'all' | 'active' | 'updates')
              }
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">All Plugins</option>
              <option value="active">Active Only</option>
              <option value="updates">Updates Available</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'date')}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Installed Plugins"
          value={installedCount}
          description="Total plugins installed"
          icon={Plug}
        />
        <MetricCard
          title="Active Plugins"
          value={activeCount}
          description="Running without errors"
          icon={CheckCircle}
        />
        <MetricCard
          title="Total Records"
          value={totalRecords.toLocaleString()}
          description="Synced from all plugins"
          icon={Activity}
        />
        <MetricCard
          title="Last Activity"
          value={
            syncStatuses.length > 0
              ? new Date(
                  Math.max(
                    ...syncStatuses.map((s) => new Date(s.lastSync).getTime()),
                  ),
                ).toLocaleDateString()
              : 'N/A'
          }
          description="Most recent sync"
          icon={Clock}
        />
      </div>

      {/* Updates filter active notice */}
      {filterActive === 'updates' && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300">
          <ArrowUpCircle className="h-4 w-4 shrink-0" />
          <span>Showing plugins with updates available. Run <code className="rounded bg-yellow-900/40 px-1 font-mono">nself plugin update</code> to update all at once.</span>
          <button
            onClick={() => setFilterActive('all')}
            className="ml-auto shrink-0 text-yellow-400 underline underline-offset-2 hover:text-yellow-200"
          >
            Show all
          </button>
        </div>
      )}

      {/* Plugin Grid */}
      {plugins.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plugins.map((plugin) => (
            <PluginCard
              key={plugin.name}
              plugin={plugin}
              syncStatus={syncStatuses.find(
                (s) => s.pluginName === plugin.name,
              )}
              onSync={handleSync}
              onDisable={handleDisable}
              onRemove={handleRemove}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          {filterActive === 'updates' ? (
            <>
              <CheckCircle className="mb-4 h-12 w-12 text-emerald-600" />
              <h3 className="mb-2 text-lg font-medium text-white">
                All plugins are up to date
              </h3>
              <p className="mb-4 text-sm text-zinc-400">
                No updates available for your installed plugins
              </p>
              <button
                onClick={() => setFilterActive('all')}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600"
              >
                View all plugins
              </button>
            </>
          ) : (
            <>
              <Zap className="mb-4 h-12 w-12 text-zinc-600" />
              <h3 className="mb-2 text-lg font-medium text-white">
                No plugins installed
              </h3>
              <p className="mb-4 text-sm text-zinc-400">
                Get started by installing plugins from the marketplace
              </p>
              <Link
                href="/plugins/marketplace"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" /> Browse Marketplace
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function PluginsPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <PluginsContent />
    </Suspense>
  )
}
