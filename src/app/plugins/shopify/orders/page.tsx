'use client'

import { TableSkeleton } from '@/components/skeletons'
import type { ShopifyOrder } from '@/types/shopify'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  MapPin,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
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

const financialStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: 'Pending', className: 'bg-yellow-500/20 text-yellow-400' },
  authorized: {
    label: 'Authorized',
    className: 'bg-blue-500/20 text-blue-400',
  },
  paid: { label: 'Paid', className: 'bg-emerald-500/20 text-emerald-400' },
  partially_paid: {
    label: 'Partially Paid',
    className: 'bg-orange-500/20 text-orange-400',
  },
  refunded: {
    label: 'Refunded',
    className: 'bg-sky-500/20 text-sky-400',
  },
  voided: { label: 'Voided', className: 'bg-zinc-500/20 text-zinc-400' },
}

const fulfillmentStatusConfig: Record<
  string,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
    className: string
  }
> = {
  fulfilled: {
    label: 'Fulfilled',
    icon: CheckCircle,
    className: 'bg-emerald-500/20 text-emerald-400',
  },
  partial: {
    label: 'Partial',
    icon: Package,
    className: 'bg-orange-500/20 text-orange-400',
  },
  unfulfilled: {
    label: 'Unfulfilled',
    icon: Clock,
    className: 'bg-yellow-500/20 text-yellow-400',
  },
  restocked: {
    label: 'Restocked',
    icon: Package,
    className: 'bg-blue-500/20 text-blue-400',
  },
}

function OrderRow({ order }: { order: ShopifyOrder }) {
  const financialStatus =
    financialStatusConfig[order.financialStatus] ||
    financialStatusConfig.pending
  const fulfillmentStatus = order.fulfillmentStatus
    ? fulfillmentStatusConfig[order.fulfillmentStatus]
    : fulfillmentStatusConfig.unfulfilled
  const FulfillmentIcon = fulfillmentStatus.icon

  return (
    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-white">{order.name}</p>
          <p className="text-xs text-zinc-500">#{order.orderNumber}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm text-zinc-300">
            {order.customerName || 'Guest'}
          </p>
          <p className="text-xs text-zinc-500">{order.email || 'No email'}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs ${financialStatus.className}`}
        >
          {financialStatus.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${fulfillmentStatus.className}`}
        >
          <FulfillmentIcon className="h-3 w-3" />
          {fulfillmentStatus.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-white">
        {formatCurrency(order.totalPrice, order.currency)}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {order.lineItemsCount} item{order.lineItemsCount !== 1 ? 's' : ''}
      </td>
      <td className="px-4 py-3">
        {order.shippingAddress && (
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <MapPin className="h-3 w-3" />
            {order.shippingAddress.city}, {order.shippingAddress.country}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {new Date(order.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <a
          href={`https://admin.shopify.com/orders/${order.id.split('/').pop()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      </td>
    </tr>
  )
}

function ShopifyOrdersContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, error, isLoading, mutate } = useSWR<{
    orders: ShopifyOrder[]
    total: number
  }>(
    `/api/plugins/shopify/orders?page=${page}&pageSize=${pageSize}&search=${searchQuery}&status=${statusFilter}`,
    fetcher,
    { refreshInterval: 60000 },
  )

  const handleSync = async () => {
    await fetch('/api/plugins/shopify/sync', { method: 'POST' })
    mutate()
  }

  const orders = data?.orders || []
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
          <h1 className="text-2xl font-semibold text-white">Orders</h1>
          <p className="text-sm text-zinc-400">View Shopify orders</p>
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
            <p className="text-red-400">Failed to load orders</p>
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
          <h1 className="text-2xl font-semibold text-white">Orders</h1>
          <p className="text-sm text-zinc-400">
            {total.toLocaleString()} total orders
          </p>
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
            placeholder="Search orders..."
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
            <option value="unfulfilled">Unfulfilled</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending Payment</option>
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
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Fulfillment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Ship To
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map((order) => <OrderRow key={order.id} order={order} />)
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
                    <p className="text-zinc-400">No orders found</p>
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
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, total)} of {total}
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

export default function ShopifyOrdersPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ShopifyOrdersContent />
    </Suspense>
  )
}
