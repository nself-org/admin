'use client'

import { CardGridSkeleton } from '@/components/skeletons'
import type { MarketplacePlugin, PluginCategory } from '@/types/plugins'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Lock,
  Loader2,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Category-based emoji icons (T02)
const categoryEmoji: Record<string, string> = {
  ai: '🤖',
  media: '🎬',
  messaging: '💬',
  auth: '🔐',
  storage: '🗄️',
  search: '🔍',
  notify: '🔔',
  payments: '💳',
  social: '👥',
  data: '📊',
  dev: '🛠️',
  cron: '⏰',
  browser: '🌐',
  billing: '💳',
  ecommerce: '🛒',
  devops: '🛠️',
  productivity: '📊',
  communication: '💬',
  finance: '💰',
  default: '🔌',
}

function getPluginEmoji(plugin: MarketplacePlugin): string {
  // Use icon from registry if it looks like an emoji (starts with non-ASCII or is short)
  if (plugin.icon && plugin.icon.length <= 4) {
    return plugin.icon
  }
  return categoryEmoji[plugin.category] ?? categoryEmoji.default
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

// Bundle display names (T07 + T08)
const bundleLabels: Record<string, string> = {
  nclaw: 'ɳClaw Bundle',
  clawde: 'ClawDE+',
  nmedia: 'nMedia',
  nfamily: 'nFamily',
  nchat: 'nChat',
}

const bundlePrice: Record<string, string> = {
  nclaw: '$0.99/mo',
  clawde: '$1.99/mo',
  nmedia: '$0.99/mo',
  nfamily: '$0.99/mo',
  nchat: '$0.99/mo',
}

function bundleLabel(bundle: string): string {
  return bundleLabels[bundle.toLowerCase()] ?? bundle
}

function bundlePriceLabel(bundle: string): string {
  return bundlePrice[bundle.toLowerCase()] ?? '$0.99/mo'
}

// Inline review section component (T04)
function ReviewSection({ pluginName }: { pluginName: string }) {
  const [open, setOpen] = useState(false)
  const [stars, setStars] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const handleSubmit = async () => {
    if (stars === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/plugins/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plugin: pluginName,
          stars,
          review: comment.trim() || undefined,
        }),
      })
      if (res.ok) {
        setToast({ type: 'success', msg: 'Review submitted' })
        setStars(0)
        setComment('')
        setTimeout(() => setToast(null), 3000)
      } else {
        setToast({ type: 'error', msg: 'Submission failed. Try again.' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch {
      setToast({ type: 'error', msg: 'Submission failed. Try again.' })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 border-t border-zinc-700/50 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Write a review
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {/* Star selector */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setStars(n)}
                onMouseEnter={() => setHoveredStar(n)}
                onMouseLeave={() => setHoveredStar(0)}
                className="transition-colors"
                aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
              >
                <Star
                  className={`h-5 w-5 ${
                    n <= (hoveredStar || stars)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-zinc-600'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Optional comment (max 500 chars)"
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600">{comment.length}/500</span>
            <button
              onClick={handleSubmit}
              disabled={stars === 0 || submitting}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-600 disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>
          {toast && (
            <p
              className={`text-xs ${toast.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {toast.msg}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function MarketplaceCard({
  plugin,
  isInstalled,
  onInstall,
  onUninstall,
  installing,
  uninstalling,
}: {
  plugin: MarketplacePlugin
  isInstalled: boolean
  onInstall: (name: string) => void
  onUninstall: (name: string) => void
  installing: string | null
  uninstalling: string | null
}) {
  const emoji = getPluginEmoji(plugin)
  const isInstalling = installing === plugin.name
  const isUninstalling = uninstalling === plugin.name
  const isPro = plugin.tier === 'pro' || plugin.licenseRequired === true
  const hasBundle = Boolean(plugin.bundle)

  return (
    <div className="group flex flex-col rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5 transition-all hover:border-emerald-500/50 hover:bg-zinc-800">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* T02: emoji icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-700/50 text-2xl select-none">
            {emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white capitalize">{plugin.name}</h3>
              {/* T08: bundle badge */}
              {hasBundle && (
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-400">
                  {bundleLabel(plugin.bundle!)}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">by {plugin.author}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs ${categoryColors[plugin.category]}`}
          >
            {plugin.category}
          </span>
          {/* T03: pro badge */}
          {isPro && (
            <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
              <Lock className="h-3 w-3" />
              Pro
            </span>
          )}
        </div>
      </div>

      {/* T02: truncated description */}
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

      {/* Stats bar */}
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

      {/* T03: install / uninstall buttons */}
      {isInstalled ? (
        <button
          onClick={() => onUninstall(plugin.name)}
          disabled={isUninstalling}
          className="flex items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-700/50 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-red-500/50 hover:bg-red-900/20 hover:text-red-400 disabled:opacity-50"
        >
          {isUninstalling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Removing...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Installed</span>
              <Trash2 className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </>
          )}
        </button>
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
          ) : isPro ? (
            <>
              <Lock className="h-4 w-4" />
              Install (license required)
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Install Plugin
            </>
          )}
        </button>
      )}

      {/* T08: bundle upsell prompt */}
      {hasBundle && !isInstalled && (
        <p className="mt-2 text-xs text-zinc-500">
          Get the full bundle:{' '}
          <Link
            href="https://nself.org/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline"
          >
            {bundleLabel(plugin.bundle!)} {bundlePriceLabel(plugin.bundle!)}
          </Link>
          {plugin.related && plugin.related.length > 0 && (
            <> — includes {plugin.related.slice(0, 3).join(', ')}</>
          )}
        </p>
      )}

      {/* T04: inline review section */}
      <ReviewSection pluginName={plugin.name} />
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
  // T07: tier + bundle filters
  const [selectedTier, setSelectedTier] = useState<'all' | 'free' | 'pro'>('all')
  const [selectedBundle, setSelectedBundle] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'name'>('popular')
  const [installing, setInstalling] = useState<string | null>(null)
  const [uninstalling, setUninstalling] = useState<string | null>(null)

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

  // T03: fix — use correct route /api/plugins/{name}/install
  const handleInstall = async (pluginName: string) => {
    setInstalling(pluginName)
    try {
      const response = await fetch(
        `/api/plugins/${encodeURIComponent(pluginName)}/install`,
        { method: 'POST' },
      )
      if (response.ok) {
        mutateInstalled()
      }
    } finally {
      setInstalling(null)
    }
  }

  // T03: uninstall via DELETE /api/plugins/{name}/install
  const handleUninstall = async (pluginName: string) => {
    setUninstalling(pluginName)
    try {
      const response = await fetch(
        `/api/plugins/${encodeURIComponent(pluginName)}/install`,
        { method: 'DELETE' },
      )
      if (response.ok) {
        mutateInstalled()
      }
    } finally {
      setUninstalling(null)
    }
  }

  // Auto-install if install param is provided
  if (installParam && !installing && marketplaceData) {
    const plugin = marketplaceData.plugins.find((p) => p.name === installParam)
    const isAlreadyInstalled = installedData?.plugins.some(
      (p) => p.name === installParam,
    )
    if (plugin && !isAlreadyInstalled) {
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
      // T07: tier filter (default free when tier absent)
      const effectiveTier = plugin.tier ?? 'free'
      const matchesTier =
        selectedTier === 'all' || effectiveTier === selectedTier
      // T07: bundle filter
      const matchesBundle =
        selectedBundle === 'all' ||
        (plugin.bundle?.toLowerCase() === selectedBundle)
      return matchesSearch && matchesCategory && matchesTier && matchesBundle
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-zinc-500" />

          {/* Category filter */}
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

          {/* T07: Tier filter */}
          <select
            value={selectedTier}
            onChange={(e) =>
              setSelectedTier(e.target.value as 'all' | 'free' | 'pro')
            }
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Tiers</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>

          {/* T07: Bundle filter */}
          <select
            value={selectedBundle}
            onChange={(e) => setSelectedBundle(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Bundles</option>
            <option value="nclaw">ɳClaw Bundle</option>
            <option value="clawde">ClawDE+</option>
            <option value="nmedia">nMedia</option>
            <option value="nfamily">nFamily</option>
            <option value="nchat">nChat</option>
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
        {selectedTier !== 'all' && ` — ${selectedTier} tier`}
        {selectedBundle !== 'all' && ` — ${bundleLabel(selectedBundle)}`}
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
              onUninstall={handleUninstall}
              installing={installing}
              uninstalling={uninstalling}
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
