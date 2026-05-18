'use client'

import { TableSkeleton } from '@/components/skeletons'
import type { ShopifyCustomer } from '@/types/shopify'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  Tag,
  Users,
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

const stateConfig = {
  enabled: {
    label: 'Active',
    icon: CheckCircle,
    className: 'bg-emerald-500/20 text-emerald-400',
  },
  disabled: {
    label: 'Disabled',
    icon: XCircle,
    className: 'bg-zinc-500/20 text-zinc-400',
  },
  declined: {
    label: 'Declined',
    icon: XCircle,
    className: 'bg-red-500/20 text-red-400',
  },
}

function CustomerRow({ customer }: { customer: ShopifyCustomer }) {
  const state = stateConfig[customer.state]
  const StateIcon = state.icon

  return (
    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700">
            <Users className="h-4 w-4 text-zinc-400" />
          </div>
          <div>
            <p className="font-medium text-white">
              {customer.firstName || customer.lastName
                ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
                : 'No name'}
            </p>
            <p className="text-xs text-zinc-500">{customer.id}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm text-zinc-300">
            <Mail className="h-3 w-3 text-zinc-500" />
            {customer.email}
          </div>
          {customer.phone && (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Phone className="h-3 w-3" />
              {customer.phone}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${state.className}`}
        >
          <StateIcon className="h-3 w-3" />
          {state.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-sm text-zinc-300">
          <ShoppingBag className="h-4 w-4 text-zinc-500" />
          {customer.ordersCount} order{customer.ordersCount !== 1 ? 's' : ''}
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-white">
        {formatCurrency(customer.totalSpent, customer.currency)}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {customer.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded bg-zinc-700/50 px-1.5 py-0.5 text-xs text-zinc-400"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
          {customer.tags.length > 2 && (
            <span className="text-xs text-zinc-500">+{customer.tags.length - 2}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {customer.acceptsMarketing ? (
          <span className="text-sm text-emerald-400">Subscribed</span>
        ) : (
          <span className="text-sm text-zinc-500">No</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {new Date(customer.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <a
          href={`https://admin.shopify.com/customers/${customer.id.split('/').pop()}`}
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

function ShopifyCustomersContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, error, isLoading, mutate } = useSWR<{
    customers: ShopifyCustomer[]
    total: number
  }>(
    `/api/plugins/shopify/customers?page=${page}&pageSize=${pageSize}&search=${searchQuery}&state=${stateFilter}`,
    fetcher,
    { refreshInterval: 60000 }
  )

  const handleSync = async () => {
    await fetch('/api/plugins/shopify/sync', { method: 'POST' })
    mutate()
  }

  const customers = data?.customers || []
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
          <h1 className="text-2xl font-semibold text-white">Customers</h1>
          <p className="text-sm text-zinc-400">View Shopify customers</p>
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
            <p className="text-red-400">Failed to load customers</p>
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
          <h1 className="text-2xl font-semibold text-white">Customers</h1>
          <p className="text-sm text-zinc-400">{total.toLocaleString()} total customers</p>
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
            placeholder="Search customers..."
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
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
          >
            <option value="all">All States</option>
            <option value="enabled">Active</option>
            <option value="disabled">Disabled</option>
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
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  State
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Orders
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Total Spent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Tags
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Marketing
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Joined
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.length > 0 ? (
                customers.map((customer) => <CustomerRow key={customer.id} customer={customer} />)
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Users className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
                    <p className="text-zinc-400">No customers found</p>
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

export default function ShopifyCustomersPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ShopifyCustomersContent />
    </Suspense>
  )
}
