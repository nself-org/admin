'use client'

import { CardGridSkeleton } from '@/components/skeletons'
import type { MarketplacePlugin, PluginCategory } from '@/types/plugins'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CreditCard,
  Download,
  Filter,
  Github,
  Loader2,
  Plug,
  Search,
  ShoppingCart,
  Star,
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

const categoryColors: Record<PluginCategory, string> = {
  billing: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  ecommerce: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  devops: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  productivity: 'bg-green-500/20 text-green-400 border-green-500/30',
  communication: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  finance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
}

const categories: { value: PluginCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'billing', label: 'Billing' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'devops', label: 'DevOps' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'communication', label: 'Communication' },
  { value: 'finance', label: 'Finance' },
]

function MarketplaceCard({
  plugin,
  isInstalled,
  onInstall,
  installing,
}: {
  plugin: MarketplacePlugin
  isInstalled: boolean
  onInstall: (name: string) => void
  installing: string | null
}) {
  const Icon = getPluginIcon(plugin.name)
  const isInstalling = installing === plugin.name

  return (
    <div className="group flex flex-col rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5 transition-all hover:border-emerald-500/50 hover:bg-zinc-800">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-700/50">
            <Icon className="h-6 w-6 text-zinc-300" />
          </div>
          <div>
            <h3 className="font-medium text-white capitalize">{plugin.name}</h3>
            <p className="text-xs text-zinc-500">by {plugin.author}</p>
          </div>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${categoryColors[plugin.category]}`}
        >
          {plugin.category}
        </span>
      </div>

      <p className="mb-4 line-clamp-2 flex-1 text-sm text-zinc-400">
        {plugin.description}
      </p>

      <div className="mb-4 flex flex-wrap gap-1">
        {plugin.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-400"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between border-t border-zinc-700/50 pt-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-zinc-400">
              {plugin.rating.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">
              {plugin.downloads.toLocaleString()}
            </span>
          </div>
        </div>
        <span className="text-xs text-zinc-500">v{plugin.version}</span>
      </div>

      {isInstalled ? (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-400">
          <Check className="h-4 w-4" />
          Installed
        </div>
      ) : (
        <button
          onClick={() => onInstall(plugin.name)}
          disabled={isInstalling}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {isInstalling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Installing...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Install Plugin
            </>
          )}
        </button>
      )}
    </div>
  )
}

function MarketplaceContent() {
  const searchParams = useSearchParams()
  const installParam = searchParams.get('install')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<
    PluginCategory | 'all'
  >('all')
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'name'>('popular')
  const [installing, setInstalling] = useState<string | null>(null)

  const {
    data: marketplaceData,
    error: marketplaceError,
    isLoading: marketplaceLoading,
  } = useSWR<{
    plugins: MarketplacePlugin[]
  }>('/api/plugins/marketplace', fetcher)

  const { data: installedData, mutate: mutateInstalled } = useSWR<{
    plugins: { name: string }[]
  }>('/api/plugins', fetcher)

  const handleInstall = async (pluginName: string) => {
    setInstalling(pluginName)
    try {
      const response = await fetch('/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pluginName }),
      })

      if (response.ok) {
        mutateInstalled()
      }
    } finally {
      setInstalling(null)
    }
  }

  // Auto-install if install param is provided
  if (installParam && !installing && marketplaceData) {
    const plugin = marketplaceData.plugins.find((p) => p.name === installParam)
    const isInstalled = installedData?.plugins.some(
      (p) => p.name === installParam,
    )
    if (plugin && !isInstalled) {
      handleInstall(installParam)
    }
  }

  const installedPluginNames = installedData?.plugins.map((p) => p.name) || []

  let filteredPlugins =
    marketplaceData?.plugins.filter((plugin) => {
      const matchesSearch =
        plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      const matchesCategory =
        selectedCategory === 'all' || plugin.category === selectedCategory
      return matchesSearch && matchesCategory
    }) || []

  // Apply sorting
  filteredPlugins = [...filteredPlugins].sort((a, b) => {
    if (sortBy === 'popular') {
      return b.downloads - a.downloads
    } else if (sortBy === 'recent') {
      return b.version.localeCompare(a.version)
    } else {
      return a.name.localeCompare(b.name)
    }
  })

  if (marketplaceLoading) {
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
          <h1 className="text-2xl font-semibold text-white">
            Plugin Marketplace
          </h1>
          <p className="text-sm text-zinc-400">
            Browse and install third-party integrations
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-lg bg-zinc-800/50"
            />
          ))}
        </div>
      </div>
    )
  }

  if (marketplaceError) {
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
          <h1 className="text-2xl font-semibold text-white">
            Plugin Marketplace
          </h1>
          <p className="text-sm text-zinc-400">
            Browse and install third-party integrations
          </p>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">Failed to load marketplace</p>
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
          href="/plugins"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plugins
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Plugin Marketplace
          </h1>
          <p className="text-sm text-zinc-400">
            Browse and install third-party integrations
          </p>
        </div>
      </div>

      {/* Search and Filters */}
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
          <Filter className="h-4 w-4 text-zinc-500" />
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value as PluginCategory | 'all')
            }
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'popular' | 'recent' | 'name')
            }
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="popular">Popular</option>
            <option value="recent">Recent</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-zinc-500">
        Showing {filteredPlugins.length} plugin
        {filteredPlugins.length !== 1 ? 's' : ''}
        {selectedCategory !== 'all' && ` in ${selectedCategory}`}
      </div>

      {/* Plugin Grid */}
      {filteredPlugins.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlugins.map((plugin) => (
            <MarketplaceCard
              key={plugin.name}
              plugin={plugin}
              isInstalled={installedPluginNames.includes(plugin.name)}
              onInstall={handleInstall}
              installing={installing}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <Search className="mb-4 h-12 w-12 text-zinc-600" />
          <h3 className="mb-2 text-lg font-medium text-white">
            No plugins found
          </h3>
          <p className="text-sm text-zinc-400">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  )
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <MarketplaceContent />
    </Suspense>
  )
}
