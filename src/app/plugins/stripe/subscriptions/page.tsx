'use client'

import { TableSkeleton } from '@/components/skeletons'
import type { StripeSubscription } from '@/types/stripe'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
  Filter,
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

const statusConfig = {
  active: {
    label: 'Active',
    icon: CheckCircle,
    className: 'bg-emerald-500/20 text-emerald-400',
  },
  canceled: {
    label: 'Canceled',
    icon: XCircle,
    className: 'bg-red-500/20 text-red-400',
  },
  incomplete: {
    label: 'Incomplete',
    icon: AlertTriangle,
    className: 'bg-yellow-500/20 text-yellow-400',
  },
  past_due: {
    label: 'Past Due',
    icon: AlertCircle,
    className: 'bg-orange-500/20 text-orange-400',
  },
  trialing: {
    label: 'Trialing',
    icon: Clock,
    className: 'bg-blue-500/20 text-blue-400',
  },
  unpaid: {
    label: 'Unpaid',
    icon: AlertCircle,
    className: 'bg-red-500/20 text-red-400',
  },
}

function SubscriptionRow({ subscription }: { subscription: StripeSubscription }) {
  const status = statusConfig[subscription.status]
  const StatusIcon = status.icon

  return (
    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-white">{subscription.productName}</p>
          <p className="text-sm text-zinc-500">{subscription.id}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm text-zinc-300">{subscription.customerEmail}</p>
          <p className="text-xs text-zinc-500">{subscription.customerId}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm ${status.className}`}
        >
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-300">
        {formatCurrency(subscription.amount, subscription.currency)}/{subscription.interval}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{' '}
        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        {subscription.cancelAtPeriodEnd && (
          <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
            Cancels at period end
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <a
          href={`https://dashboard.stripe.com/subscriptions/${subscription.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      </td>
    </tr>
  )
}

function StripeSubscriptionsContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, error, isLoading, mutate } = useSWR<{
    subscriptions: StripeSubscription[]
    total: number
  }>(
    `/api/plugins/stripe/subscriptions?page=${page}&pageSize=${pageSize}&search=${searchQuery}&status=${statusFilter}`,
    fetcher,
    { refreshInterval: 60000 }
  )

  const handleSync = async () => {
    await fetch('/api/plugins/stripe/sync', { method: 'POST' })
    mutate()
  }

  const subscriptions = data?.subscriptions || []
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
          <h1 className="text-2xl font-semibold text-white">Subscriptions</h1>
          <p className="text-sm text-zinc-400">Manage Stripe subscriptions</p>
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
            <p className="text-red-400">Failed to load subscriptions</p>
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
          <h1 className="text-2xl font-semibold text-white">Subscriptions</h1>
          <p className="text-sm text-zinc-400">{total.toLocaleString()} total subscriptions</p>
        </div>
        <button
          onClick={handleSync}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
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
            placeholder="Search by email or product..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
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
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Canceled</option>
            <option value="unpaid">Unpaid</option>
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
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Billing Period
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Notes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length > 0 ? (
                subscriptions.map((subscription) => (
                  <SubscriptionRow key={subscription.id} subscription={subscription} />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <CreditCard className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
                    <p className="text-zinc-400">No subscriptions found</p>
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

export default function StripeSubscriptionsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <StripeSubscriptionsContent />
    </Suspense>
  )
}
