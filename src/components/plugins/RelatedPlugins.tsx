'use client'

/**
 * RelatedPlugins — horizontal scrollable row of mini plugin cards for other
 * plugins in the same bundle.
 */

import type { MarketplacePlugin } from '@/types/plugins'
import Link from 'next/link'

export interface RelatedPluginsProps {
  pluginName: string
  related: string[]
  bundle: string | null
  bundleName: string | null
  allPlugins: MarketplacePlugin[]
}

function TierBadge({ tier }: { tier: 'free' | 'pro' }) {
  if (tier === 'free') {
    return (
      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
        Free
      </span>
    )
  }
  return (
    <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-300">
      Pro
    </span>
  )
}

function RelatedPluginMiniCard({ plugin }: { plugin: MarketplacePlugin }) {
  const displayName = plugin.displayName || plugin.name
  const price = plugin.price ?? (plugin.tier === 'free' ? 'Free' : '$0.99/mo')

  return (
    <Link
      href={`/plugins/${encodeURIComponent(plugin.name)}`}
      className="flex w-40 shrink-0 flex-col gap-2 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-3 transition-all hover:border-indigo-500/50 hover:bg-zinc-800"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-700/50 text-xl">
          {plugin.icon || '🔌'}
        </div>
        <span className="line-clamp-2 text-xs font-medium leading-tight text-white">
          {displayName}
        </span>
      </div>
      <div className="flex items-center justify-between gap-1">
        <TierBadge tier={plugin.tier ?? 'free'} />
        <span className="text-xs text-zinc-400">{price}</span>
      </div>
    </Link>
  )
}

export function RelatedPlugins({
  pluginName,
  related,
  bundle,
  bundleName,
  allPlugins,
}: RelatedPluginsProps) {
  if (related.length === 0) return null

  const relatedPlugins = related
    .filter((name) => name !== pluginName)
    .map((name) => allPlugins.find((p) => p.name === name))
    .filter((p): p is MarketplacePlugin => p !== undefined)

  if (relatedPlugins.length === 0) return null

  const heading =
    bundle && bundleName
      ? `More plugins in ${bundleName}`
      : 'Related plugins'

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">{heading}</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {relatedPlugins.map((plugin) => (
          <RelatedPluginMiniCard key={plugin.name} plugin={plugin} />
        ))}
      </div>
    </div>
  )
}
