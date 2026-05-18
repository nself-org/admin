'use client'

import { TableSkeleton } from '@/components/skeletons'
import type { ShopifyProduct } from '@/types/shopify'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Filter,
  Image as ImageIcon,
  Package,
  RefreshCw,
  Search,
  Tag,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount)
}

const statusConfig = {
  active: {
    label: 'Active',
    icon: CheckCircle,
    className: 'bg-emerald-500/20 text-emerald-400',
  },
  archived: {
    label: 'Archived',
    icon: XCircle,
    className: 'bg-zinc-500/20 text-zinc-400',
  },
  draft: {
    label: 'Draft',
    icon: FileText,
    className: 'bg-yellow-500/20 text-yellow-400',
  },
}

function ProductCard({ product }: { product: ShopifyProduct }) {
  const status = statusConfig[product.status]
  const StatusIcon = status.icon

  return (
    <div className="group overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50 transition-all hover:border-green-500/50">
      {/* Product Image */}
      <div className="flex aspect-square items-center justify-center bg-zinc-900/50">
        {product.images.length > 0 ? (
          <img src={product.images[0]} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-16 w-16 text-zinc-700" />
        )}
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-white">{product.title}</h3>
            <p className="text-xs text-zinc-500">{product.handle}</p>
          </div>
          <span
            className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${status.className}`}
          >
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </span>
        </div>

        {/* Vendor & Type */}
        {(product.vendor || product.productType) && (
          <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
            {product.vendor && <span>{product.vendor}</span>}
            {product.vendor && product.productType && <span>|</span>}
            {product.productType && <span>{product.productType}</span>}
          </div>
        )}

        {/* Tags */}
        {product.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {product.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded bg-zinc-700/50 px-1.5 py-0.5 text-xs text-zinc-400"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
            {product.tags.length > 3 && (
              <span className="text-xs text-zinc-500">+{product.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Price & Inventory */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-white">
              {formatCurrency(product.priceRange.min, product.priceRange.currency)}
            </span>
            {product.priceRange.max !== product.priceRange.min && (
              <span className="text-sm text-zinc-500">
                {' '}
                - {formatCurrency(product.priceRange.max, product.priceRange.currency)}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-400">{product.totalInventory} in stock</p>
            <p className="text-xs text-zinc-500">
              {product.variantCount} variant
              {product.variantCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-700/50 pt-3">
          <span className="text-xs text-zinc-500">
            Updated {new Date(product.updatedAt).toLocaleDateString()}
          </span>
          <a
            href={`https://admin.shopify.com/products/${product.id.split('/').pop()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300"
          >
            View <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  )
}

function ShopifyProductsContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 12

  const { data, error, isLoading, mutate } = useSWR<{
    products: ShopifyProduct[]
    total: number
  }>(
    `/api/plugins/shopify/products?page=${page}&pageSize=${pageSize}&search=${searchQuery}&status=${statusFilter}`,
    fetcher,
    { refreshInterval: 60000 }
  )

  const handleSync = async () => {
    await fetch('/api/plugins/shopify/sync', { method: 'POST' })
    mutate()
  }

  const products = data?.products || []
  const total = data?.total || 0
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
          <h1 className="text-2xl font-semibold text-white">Products</h1>
          <p className="text-sm text-zinc-400">Browse Shopify products</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-lg bg-zinc-800/50" />
          ))}
        </div>
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
            <p className="text-red-400">Failed to load products</p>
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
          <h1 className="text-2xl font-semibold text-white">Products</h1>
          <p className="text-sm text-zinc-400">{total.toLocaleString()} total products</p>
        </div>
        <button
          onClick={handleSync}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500"
        >
          <RefreshCw className="h-4 w-4" />
          Sync
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search products..."
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <Package className="mb-4 h-12 w-12 text-zinc-600" />
          <p className="text-zinc-400">No products found</p>
        </div>
      )}

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

export default function ShopifyProductsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ShopifyProductsContent />
    </Suspense>
  )
}
