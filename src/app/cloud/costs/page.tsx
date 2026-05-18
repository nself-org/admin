'use client'

import { ChartSkeleton } from '@/components/skeletons'
import type { CostComparison, ServerSize } from '@/types/cloud'
import {
  ArrowUpDown,
  CheckCircle,
  Cpu,
  DollarSign,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Star,
  TrendingDown,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const sizeLabels: Record<ServerSize, { label: string; description: string; icon: typeof Cpu }> = {
  tiny: { label: 'Tiny', description: '1 vCPU, 1-2 GB RAM', icon: Zap },
  small: { label: 'Small', description: '1-2 vCPU, 2-4 GB RAM', icon: Cpu },
  medium: {
    label: 'Medium',
    description: '2-4 vCPU, 4-8 GB RAM',
    icon: MemoryStick,
  },
  large: {
    label: 'Large',
    description: '4-8 vCPU, 8-16 GB RAM',
    icon: HardDrive,
  },
  xlarge: {
    label: 'XLarge',
    description: '8+ vCPU, 16-32 GB RAM',
    icon: HardDrive,
  },
}

function CostsContent() {
  const [selectedSize, setSelectedSize] = useState<ServerSize>('medium')
  const [sortBy, setSortBy] = useState<'price' | 'provider'>('price')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const { data, isLoading, mutate } = useSWR<{ costs: CostComparison[] }>(
    '/api/cloud/costs',
    fetcher
  )

  const costData = data?.costs ?? []
  const selectedCost = costData.find((c) => c.size === selectedSize)

  const sortedProviders = selectedCost
    ? [...selectedCost.providers].sort((a, b) => {
        if (sortBy === 'price') {
          return sortOrder === 'asc'
            ? a.monthlyPrice - b.monthlyPrice
            : b.monthlyPrice - a.monthlyPrice
        }
        return sortOrder === 'asc'
          ? a.displayName.localeCompare(b.displayName)
          : b.displayName.localeCompare(a.displayName)
      })
    : []

  const lowestPrice = selectedCost
    ? Math.min(...selectedCost.providers.map((p) => p.monthlyPrice))
    : 0

  const toggleSort = (column: 'price' | 'provider') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Cost Comparison</h1>
          <p className="text-sm text-zinc-400">Compare pricing across providers</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-lg bg-zinc-800/50" />
          <div className="h-96 rounded-lg bg-zinc-800/50" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="mt-12 mb-4">
        <h1 className="bg-gradient-to-r from-emerald-600 to-black bg-clip-text text-4xl/tight font-extrabold text-transparent sm:text-6xl/tight dark:from-emerald-400 dark:to-white">
          Cost Comparison
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Compare cloud server pricing across providers to find the best value
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => mutate()}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Prices
        </button>
      </div>

      {/* Size Selector */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {(Object.keys(sizeLabels) as ServerSize[]).map((size) => {
          const sizeInfo = sizeLabels[size]
          const Icon = sizeInfo.icon
          const costInfo = costData.find((c) => c.size === size)
          const cheapest = costInfo ? Math.min(...costInfo.providers.map((p) => p.monthlyPrice)) : 0

          return (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`rounded-lg border p-4 text-left transition-all ${
                selectedSize === size
                  ? 'border-emerald-500 bg-emerald-900/20'
                  : 'border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-emerald-400" />
                {selectedSize === size && <CheckCircle className="h-4 w-4 text-emerald-400" />}
              </div>
              <h3 className="mt-2 font-medium text-white">{sizeInfo.label}</h3>
              <p className="text-sm text-zinc-400">{sizeInfo.description}</p>
              <p className="mt-2 text-lg font-bold text-emerald-400">
                From ${cheapest.toFixed(2)}/mo
              </p>
            </button>
          )
        })}
      </div>

      {/* Price Comparison Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/50">
        <div className="border-b border-zinc-700/50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {sizeLabels[selectedSize].label} Servers
            </h2>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <TrendingDown className="h-4 w-4 text-emerald-400" />
              <span>
                Save up to{' '}
                <span className="font-medium text-emerald-400">
                  {Math.round(
                    ((Math.max(...sortedProviders.map((p) => p.monthlyPrice)) - lowestPrice) /
                      Math.max(...sortedProviders.map((p) => p.monthlyPrice))) *
                      100
                  )}
                  %
                </span>{' '}
                by choosing wisely
              </span>
            </div>
          </div>
        </div>

        <table className="w-full">
          <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                <button
                  onClick={() => toggleSort('provider')}
                  className="flex items-center gap-1 hover:text-white"
                >
                  Provider
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Specs
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                <button
                  onClick={() => toggleSort('price')}
                  className="flex items-center gap-1 hover:text-white"
                >
                  Monthly Price
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                vs. Cheapest
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700/50">
            {sortedProviders.map((provider, index) => {
              const priceDiff = provider.monthlyPrice - lowestPrice
              const priceDiffPercent = lowestPrice > 0 ? (priceDiff / lowestPrice) * 100 : 0

              return (
                <tr
                  key={provider.provider}
                  className={`hover:bg-zinc-800/50 ${
                    provider.recommended ? 'bg-emerald-900/10' : ''
                  }`}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700 font-semibold text-white">
                        {provider.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{provider.displayName}</span>
                          {provider.badge && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-400">
                              <Star className="h-3 w-3" />
                              {provider.badge}
                            </span>
                          )}
                        </div>
                        {index === 0 && sortBy === 'price' && sortOrder === 'asc' && (
                          <span className="text-xs text-emerald-400">Lowest price</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-zinc-400">{provider.specs}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-lg font-bold text-white">
                      ${provider.monthlyPrice.toFixed(2)}
                    </span>
                    <span className="text-sm text-zinc-500">/mo</span>
                  </td>
                  <td className="px-4 py-4">
                    {priceDiff === 0 ? (
                      <span className="text-emerald-400">Best price</span>
                    ) : (
                      <span className="text-amber-400">
                        +${priceDiff.toFixed(2)} (+{priceDiffPercent.toFixed(0)}
                        %)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/cloud/servers/create?provider=${provider.provider}&size=${selectedSize}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
                    >
                      Deploy
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
        <div className="flex items-start gap-3">
          <DollarSign className="mt-0.5 h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="font-medium text-white">About these prices</h3>
            <p className="text-sm text-zinc-400">
              Prices are estimated based on standard compute instances and may vary based on region,
              availability, and promotional offers. AWS prices include on-demand pricing for t3
              instances. Storage and bandwidth costs may apply additionally.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CostsPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <CostsContent />
    </Suspense>
  )
}
