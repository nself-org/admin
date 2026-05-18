'use client'

import { TableSkeleton } from '@/components/skeletons'
import type { StripePrice, StripeProduct } from '@/types/stripe'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  Package,
  RefreshCw,
  Search,
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
  }).format(amount / 100)
}

function ProductCard({ product, prices }: { product: StripeProduct; prices: StripePrice[] }) {
  const productPrices = prices.filter((p) => p.productId === product.id)

  return (
    <div className="group overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50 transition-all hover:border-purple-500/50">
      {/* Product Image */}
      <div className="flex aspect-video items-center justify-center bg-zinc-900/50">
        {product.images.length > 0 ? (
          <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-12 w-12 text-zinc-700" />
        )}
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h3 className="font-medium text-white">{product.name}</h3>
            <p className="text-xs text-zinc-500">{product.id}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
              product.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'
            }`}
          >
            {product.active ? (
              <>
                <CheckCircle className="h-3 w-3" /> Active
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" /> Inactive
              </>
            )}
          </span>
        </div>

        {/* Description */}
        {product.description && (
          <p className="mb-3 line-clamp-2 text-sm text-zinc-400">{product.description}</p>
        )}

        {/* Prices */}
        {productPrices.length > 0 && (
          <div className="mb-3 space-y-1">
            {productPrices.slice(0, 3).map((price) => (
              <div key={price.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  {price.type === 'recurring' ? `${price.interval}ly` : 'One-time'}
                </span>
                <span className="font-medium text-white">
                  {formatCurrency(price.unitAmount, price.currency)}
                  {price.type === 'recurring' && `/${price.interval}`}
                </span>
              </div>
            ))}
            {productPrices.length > 3 && (
              <p className="text-xs text-zinc-500">+{productPrices.length - 3} more prices</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-700/50 pt-3">
          <span className="text-xs text-zinc-500">
            Created {new Date(product.created).toLocaleDateString()}
          </span>
          <a
            href={`https://dashboard.stripe.com/products/${product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
          >
            View <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  )
}

function StripeProductsContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 12

  const { data, error, isLoading, mutate } = useSWR<{
    products: StripeProduct[]
    prices: StripePrice[]
    total: number
  }>(
    `/api/plugins/stripe/products?page=${page}&pageSize=${pageSize}&search=${searchQuery}`,
    fetcher,
    { refreshInterval: 60000 }
  )

  const handleSync = async () => {
    await fetch('/api/plugins/stripe/sync', { method: 'POST' })
    mutate()
  }

  const products = data?.products || []
  const prices = data?.prices || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/plugins/stripe"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Stripe Dashboard
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Products</h1>
          <p className="text-sm text-zinc-400">View Stripe products and pricing</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-zinc-800/50" />
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
            href="/plugins/stripe"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Stripe Dashboard
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
          href="/plugins/stripe"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Stripe Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Products</h1>
          <p className="text-sm text-zinc-400">{total.toLocaleString()} total products</p>
        </div>
        <button
          onClick={handleSync}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
        >
          <RefreshCw className="h-4 w-4" />
          Sync
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(1)
          }}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
        />
      </div>

      {/* Product Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} prices={prices} />
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

export default function StripeProductsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <StripeProductsContent />
    </Suspense>
  )
}
