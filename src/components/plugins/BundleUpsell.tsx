'use client'

/**
 * BundleUpsell — indigo gradient card encouraging upgrade to the full bundle
 * when viewing a pro plugin. Only renders if bundle is non-null.
 */

import { ExternalLink } from 'lucide-react'

export interface BundleUpsellProps {
  bundle: string | null
  bundleName: string | null
  bundlePrice: string | null
  pluginsInBundle: string[]
  installedCount: number
  totalCount: number
}

const MAX_ICONS = 6

export function BundleUpsell({
  bundle,
  bundleName,
  bundlePrice,
  pluginsInBundle,
  installedCount,
  totalCount,
}: BundleUpsellProps) {
  if (!bundle) return null

  const displayName = bundleName ?? bundle
  const price = bundlePrice ?? '$0.99/mo'
  const visiblePlugins = pluginsInBundle.slice(0, MAX_ICONS)
  const extraCount = pluginsInBundle.length - MAX_ICONS

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/40 to-zinc-900/60 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-white">
            Get the full {displayName}
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-indigo-300">{price}</span>
            <span className="text-zinc-500">per month</span>
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300">
              {totalCount} plugins
            </span>
          </div>
        </div>
      </div>

      {installedCount > 0 && (
        <p className="mb-4 text-sm text-zinc-400">
          You have{' '}
          <span className="font-medium text-indigo-300">{installedCount}</span>{' '}
          of{' '}
          <span className="font-medium text-white">{totalCount}</span> plugins
          in this bundle
        </p>
      )}

      {pluginsInBundle.length > 0 && (
        <div className="mb-4 flex items-center gap-1.5">
          {visiblePlugins.map((name) => (
            <div
              key={name}
              title={name}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 text-sm"
            >
              🔌
            </div>
          ))}
          {extraCount > 0 && (
            <div className="flex h-8 items-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-2 text-xs text-zinc-400">
              +{extraCount} more
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <a
          href="https://nself.org/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Upgrade to {displayName}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <p className="text-center text-xs text-zinc-500">
          Or get ɳSelf+ for $49.99/yr — all bundles + all apps
        </p>
      </div>
    </div>
  )
}
