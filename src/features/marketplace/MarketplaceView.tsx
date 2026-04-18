'use client'

import type { MarketplacePlugin, PluginCategory } from '@/types/plugins'
import { Loader2, Plug, Search } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface MarketplaceViewProps {
  initialCategory?: PluginCategory
}

export function MarketplaceView({ initialCategory }: MarketplaceViewProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<PluginCategory | 'all'>(
    initialCategory ?? 'all',
  )

  const { data, error, isLoading } = useSWR<{ plugins: MarketplacePlugin[] }>(
    '/api/marketplace/plugins',
    fetcher,
  )
  const { data: installedData } = useSWR<{ plugins: Array<{ name: string }> }>(
    '/api/plugins/installed',
    fetcher,
  )
  const installedNames = new Set(
    installedData?.plugins.map((p) => p.name) ?? [],
  )

  const plugins = (data?.plugins ?? []).filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'all' || p.category === category
    return matchesSearch && matchesCategory
  })

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
        <Plug className="h-4 w-4 shrink-0" />
        Failed to load marketplace. Check your connection and try again.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plugins..."
            className="w-full rounded-lg border border-gray-800 bg-gray-900 py-2 pr-3 pl-9 text-sm text-gray-200 placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as PluginCategory | 'all')
          }
          className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All categories</option>
          <option value="billing">Billing</option>
          <option value="ecommerce">Ecommerce</option>
          <option value="devops">DevOps</option>
          <option value="productivity">Productivity</option>
          <option value="communication">Communication</option>
          <option value="finance">Finance</option>
        </select>
      </div>

      {plugins.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          No plugins match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plugins.map((plugin) => {
            const isInstalled = installedNames.has(plugin.name)
            return (
              <div
                key={plugin.name}
                className="rounded-lg border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Plug className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm font-medium text-gray-200">
                      {plugin.name}
                    </span>
                  </div>
                  {isInstalled && (
                    <span className="rounded-full bg-green-900/40 px-2 py-0.5 text-xs text-green-400">
                      installed
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-xs text-gray-400">
                  {plugin.description}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
