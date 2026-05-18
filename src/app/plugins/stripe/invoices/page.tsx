'use client'

import { TableSkeleton } from '@/components/skeletons'
import type { StripeInvoice } from '@/types/stripe'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Receipt,
  RefreshCw,
  Search,
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
  draft: {
    label: 'Draft',
    icon: FileText,
    className: 'bg-zinc-500/20 text-zinc-400',
  },
  open: {
    label: 'Open',
    icon: Clock,
    className: 'bg-blue-500/20 text-blue-400',
  },
  paid: {
    label: 'Paid',
    icon: CheckCircle,
    className: 'bg-emerald-500/20 text-emerald-400',
  },
  uncollectible: {
    label: 'Uncollectible',
    icon: AlertCircle,
    className: 'bg-red-500/20 text-red-400',
  },
  void: {
    label: 'Void',
    icon: AlertCircle,
    className: 'bg-zinc-500/20 text-zinc-500',
  },
}

function InvoiceRow({ invoice }: { invoice: StripeInvoice }) {
  const status = statusConfig[invoice.status]
  const StatusIcon = status.icon

  return (
    <tr className="border-b border-zinc-700/50 hover:bg-zinc-800/50">
      <td className="px-4 py-3">
        <div>
          <p className="font-mono text-sm font-medium text-white">{invoice.id}</p>
          {invoice.subscriptionId && (
            <p className="text-xs text-zinc-500">Sub: {invoice.subscriptionId}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-zinc-300">{invoice.customerEmail}</p>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm ${status.className}`}
        >
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-white">
        {formatCurrency(invoice.amount, invoice.currency)}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {new Date(invoice.created).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}
      </td>
      <td className="px-4 py-3">
        {invoice.paidAt && (
          <span className="text-sm text-emerald-400">
            {new Date(invoice.paidAt).toLocaleDateString()}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {invoice.hostedInvoiceUrl && (
            <a
              href={invoice.hostedInvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
            >
              View <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {invoice.invoicePdf && (
            <a
              href={invoice.invoicePdf}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-300"
            >
              <Download className="h-3 w-3" />
            </a>
          )}
        </div>
      </td>
    </tr>
  )
}

function StripeInvoicesContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, error, isLoading, mutate } = useSWR<{
    invoices: StripeInvoice[]
    total: number
  }>(
    `/api/plugins/stripe/invoices?page=${page}&pageSize=${pageSize}&search=${searchQuery}&status=${statusFilter}`,
    fetcher,
    { refreshInterval: 60000 }
  )

  const handleSync = async () => {
    await fetch('/api/plugins/stripe/sync', { method: 'POST' })
    mutate()
  }

  const invoices = data?.invoices || []
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
          <h1 className="text-2xl font-semibold text-white">Invoices</h1>
          <p className="text-sm text-zinc-400">View Stripe invoices</p>
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
            <p className="text-red-400">Failed to load invoices</p>
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
          <h1 className="text-2xl font-semibold text-white">Invoices</h1>
          <p className="text-sm text-zinc-400">{total.toLocaleString()} total invoices</p>
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
            placeholder="Search by email or invoice ID..."
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
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="paid">Paid</option>
            <option value="uncollectible">Uncollectible</option>
            <option value="void">Void</option>
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
                  Invoice
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
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Paid
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} />)
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Receipt className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
                    <p className="text-zinc-400">No invoices found</p>
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

export default function StripeInvoicesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <StripeInvoicesContent />
    </Suspense>
  )
}
