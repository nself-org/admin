'use client'

import { TableSkeleton } from '@/components/skeletons'
import type { ShopifyInventoryLevel } from '@/types/shopify'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Package,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function getStockStatus(level: ShopifyInventoryLevel) {
  if (level.available <= 0) {
    return {
      label: 'Out of Stock',
      icon: XCircle,
      className: 'bg-red-500/20 text-red-400',
      color: 'text-red-400',
    }
  }
  if (level.available <= 10) {
    return {
      label: 'Low Stock',
      icon: AlertTriangle,
      className: 'bg-yellow-500/20 text-yellow-400',
      color: 'text-yellow-400',
    }
  }
  return {
    label: 'In Stock',
    icon: CheckCircle,
    className: 'bg-emerald-500/20 text-emerald-400',
    color: 'text-emerald-400',
  }
}

function InventoryRow({ level }: { level: ShopifyInventoryLevel }) {
  const status = getStockStatus(level)
  const StatusIcon = status.icon

  const _totalQuantity = level.available + level.incoming + level.committed + level.reserved

  return (
    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-white">{level.productTitle}</p>
          <p className="text-sm text-zinc-500">{level.variantTitle}</p>
          {level.sku && <p className="text-xs text-zinc-600">SKU: {level.sku}</p>}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-sm text-zinc-400">
          <MapPin className="h-4 w-4 text-zinc-500" />
          {level.locationName}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${status.className}`}
        >
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-lg font-bold ${status.color}`}>{level.available}</span>
      </td>
      <td className="px-4 py-3">
        {level.incoming > 0 ? (
          <div className="flex items-center gap-1 text-sm text-blue-400">
            <TrendingUp className="h-4 w-4" />+{level.incoming}
          </div>
        ) : (
          <span className="text-sm text-zinc-500">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        {level.committed > 0 ? (
          <div className="flex items-center gap-1 text-sm text-orange-400">
            <TrendingDown className="h-4 w-4" />-{level.committed}
          </div>
        ) : (
          <span className="text-sm text-zinc-500">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {level.reserved > 0 ? level.reserved : '-'}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {level.damaged > 0 ? <span className="text-red-400">{level.damaged}</span> : '-'}
      </td>
    </tr>
  )
}

function ShopifyInventoryContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [stockFilter, setStockFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, error, isLoading, mutate } = useSWR<{
    inventoryLevels: ShopifyInventoryLevel[]
    total: number
    stats: {
      inStock: number
      lowStock: number
      outOfStock: number
    }
  }>(
    `/api/plugins/shopify/inventory?page=${page}&pageSize=${pageSize}&search=${searchQuery}&stock=${stockFilter}`,
    fetcher,
    { refreshInterval: 60000 }
  )

  const handleSync = async () => {
    await fetch('/api/plugins/shopify/sync', { method: 'POST' })
    mutate()
  }

  const inventoryLevels = data?.inventoryLevels || []
  const total = data?.total || 0
  const stats = data?.stats || { inStock: 0, lowStock: 0, outOfStock: 0 }
  const totalPages = Math.ceil(total / pageSize)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/plugins/shopify"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shopify Dashboard
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Inventory</h1>
          <p className="text-sm text-zinc-400">Stock levels and alerts</p>
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-zinc-800/50" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/plugins/shopify"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shopify Dashboard
          </Link>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">Failed to load inventory</p>
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
          href="/plugins/shopify"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shopify Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Inventory</h1>
          <p className="text-sm text-zinc-400">{total.toLocaleString()} inventory items</p>
        </div>
        <button
          onClick={handleSync}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500"
        >
          <RefreshCw className="h-4 w-4" />
          Sync
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">In Stock</span>
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{stats.inStock}</p>
        </div>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Low Stock</span>
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-yellow-400">{stats.lowStock}</p>
        </div>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Out of Stock</span>
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-400">{stats.outOfStock}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search products or SKU..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select
            value={stockFilter}
            onChange={(e) => {
              setStockFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
          >
            <option value="all">All Stock Levels</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Available
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Incoming
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Committed
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Reserved
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Damaged
                </th>
              </tr>
            </thead>
            <tbody>
              {inventoryLevels.length > 0 ? (
                inventoryLevels.map((level) => (
                  <InventoryRow
                    key={`${level.inventoryItemId}-${level.locationId}`}
                    level={level}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Package className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
                    <p className="text-zinc-400">No inventory items found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="px-3 text-sm text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ShopifyInventoryPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ShopifyInventoryContent />
    </Suspense>
  )
}
