'use client'

/**
 * Plugin Install Page — /plugins/install
 * Shows available plugins (free + pro) from registry.
 * One-click install delegates to POST /api/plugins.
 * Shows install progress via polling /api/plugins/[name] status.
 */

import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Lock,
  Package,
  Search,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AvailablePlugin {
  name: string
  version: string
  description: string
  category?: string
  tier: 'free' | 'pro' | 'max'
  installed?: boolean
}

interface RegistryResponse {
  success: boolean
  plugins?: AvailablePlugin[]
}

interface InstallState {
  plugin: string
  status: 'idle' | 'installing' | 'done' | 'error'
  message?: string
}

const TIER_COLORS: Record<string, string> = {
  free: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pro:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  max:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  pro:  'Pro',
  max:  'Max',
}

function PluginCard({
  plugin,
  onInstall,
  installState,
}: {
  plugin: AvailablePlugin
  onInstall: (name: string) => void
  installState?: InstallState
}) {
  const isInstalling = installState?.status === 'installing'
  const isDone = installState?.status === 'done' || plugin.installed
  const isError = installState?.status === 'error'
  const isLocked = plugin.tier !== 'free'

  return (
    <div className="flex flex-col rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 transition-all hover:border-zinc-600/50">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-zinc-500" />
            <h3 className="font-medium text-white capitalize">{plugin.name}</h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">v{plugin.version}</p>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${TIER_COLORS[plugin.tier] || TIER_COLORS.free}`}
        >
          {TIER_LABELS[plugin.tier] || plugin.tier}
        </span>
      </div>

      {plugin.category && (
        <p className="mb-2 text-xs text-zinc-600 uppercase tracking-wider">
          {plugin.category}
        </p>
      )}

      <p className="mb-4 flex-1 text-sm text-zinc-400 line-clamp-2">
        {plugin.description}
      </p>

      {/* Install button */}
      {isDone ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          Installed
        </div>
      ) : isLocked ? (
        <div className="flex items-center gap-2 rounded-lg bg-zinc-700/30 px-3 py-2 text-sm text-zinc-500">
          <Lock className="h-4 w-4" />
          License required
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onInstall(plugin.name)}
          disabled={isInstalling}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600/80 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-60"
          aria-label={`Install ${plugin.name}`}
        >
          {isInstalling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Installing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Install
            </>
          )}
        </button>
      )}

      {isError && installState?.message && (
        <p
          role="alert"
          className="mt-2 text-xs text-red-400"
        >
          {installState.message}
        </p>
      )}

      {isInstalling && installState?.message && (
        <p className="mt-2 text-xs text-zinc-500">{installState.message}</p>
      )}
    </div>
  )
}

export default function PluginInstallPage() {
  const [search, setSearch] = useState('')
  const [installStates, setInstallStates] = useState<
    Record<string, InstallState>
  >({})

  // Fetch available plugins from admin marketplace endpoint
  const { data, isLoading } = useSWR<RegistryResponse>(
    '/api/plugins/marketplace',
    fetcher,
    { refreshInterval: 60000 },
  )

  // Fallback: use the installed list from /api/plugins to mark installed
  const { data: installedData } = useSWR<{ plugins?: AvailablePlugin[] }>(
    '/api/plugins',
    fetcher,
    { refreshInterval: 30000 },
  )

  const installedNames = new Set(
    (installedData?.plugins ?? []).map((p) => p.name),
  )

  // Combine marketplace data with installed status
  const plugins = (data?.plugins ?? []).map((p) => ({
    ...p,
    installed: installedNames.has(p.name),
  }))

  // Filter by search
  const filtered = plugins.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()),
  )

  const handleInstall = async (pluginName: string) => {
    setInstallStates((prev) => ({
      ...prev,
      [pluginName]: { plugin: pluginName, status: 'installing', message: 'Starting installation...' },
    }))

    try {
      const response = await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pluginName }),
      })

      const result = await response.json()

      if (result.success) {
        setInstallStates((prev) => ({
          ...prev,
          [pluginName]: { plugin: pluginName, status: 'done' },
        }))
      } else {
        setInstallStates((prev) => ({
          ...prev,
          [pluginName]: {
            plugin: pluginName,
            status: 'error',
            message: result.error || 'Installation failed',
          },
        }))
      }
    } catch (err) {
      setInstallStates((prev) => ({
        ...prev,
        [pluginName]: {
          plugin: pluginName,
          status: 'error',
          message: err instanceof Error ? err.message : 'Installation failed',
        },
      }))
    }
  }

  // Group by category
  const categories = new Set(filtered.map((p) => p.category || 'general'))

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/plugins"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
            aria-label="Back to plugins"
          >
            <ArrowLeft className="h-4 w-4" />
            Plugins
          </Link>
          <h1 className="text-xl font-semibold text-white">Install Plugin</h1>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plugins..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            aria-label="Search plugins"
          />
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-xl bg-zinc-800/50"
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-8 text-center">
            <Package className="mx-auto mb-2 h-8 w-8 text-zinc-700" />
            <p className="text-zinc-400">
              {search
                ? `No plugins found matching "${search}"`
                : 'No plugins available'}
            </p>
          </div>
        )}

        {/* Plugin grid — grouped by category */}
        {!isLoading &&
          Array.from(categories).map((category) => {
            const categoryPlugins = filtered.filter(
              (p) => (p.category || 'general') === category,
            )
            if (categoryPlugins.length === 0) return null

            return (
              <div key={category} className="mb-8">
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500 capitalize">
                  {category}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryPlugins.map((plugin) => (
                    <PluginCard
                      key={plugin.name}
                      plugin={plugin}
                      onInstall={handleInstall}
                      installState={installStates[plugin.name]}
                    />
                  ))}
                </div>
              </div>
            )
          })}

        {/* License note */}
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center text-sm text-zinc-500">
          <Lock className="mx-auto mb-1 h-4 w-4" />
          Pro plugins require a license key.{' '}
          <a
            href="https://nself.org/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            Get a license at nself.org/pricing
          </a>
        </div>
      </div>
    </div>
  )
}
