'use client'

import { TableSkeleton } from '@/components/skeletons'
import type { StripeWebhookEvent } from '@/types/stripe'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  RefreshCw,
  RotateCcw,
  Webhook,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const statusConfig = {
  received: {
    label: 'Received',
    icon: Clock,
    className: 'bg-blue-500/20 text-blue-400',
  },
  processed: {
    label: 'Processed',
    icon: CheckCircle,
    className: 'bg-emerald-500/20 text-emerald-400',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-500/20 text-red-400',
  },
}

function WebhookEventRow({ event }: { event: StripeWebhookEvent }) {
  const [expanded, setExpanded] = useState(false)
  const status = statusConfig[event.status]
  const StatusIcon = status.icon

  return (
    <>
      <tr
        className="cursor-pointer border-b border-zinc-700/50 hover:bg-zinc-800/50"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
            <span className="font-mono text-sm text-white">{event.type}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-zinc-500">{event.id}</span>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${status.className}`}
          >
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-zinc-400">
          {new Date(event.receivedAt).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-400">
          {event.processedAt ? new Date(event.processedAt).toLocaleString() : '-'}
        </td>
        <td className="px-4 py-3">
          {event.status === 'failed' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                // Handle retry
              }}
              className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-zinc-700/50 bg-zinc-900/30">
          <td colSpan={6} className="px-4 py-4">
            <div className="space-y-3">
              {event.error && (
                <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-3">
                  <p className="mb-1 text-sm font-medium text-red-400">Error</p>
                  <p className="text-sm text-red-300">{event.error}</p>
                </div>
              )}
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-400">Payload</p>
                <pre className="max-h-64 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-300">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function StripeWebhooksContent() {
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, error, isLoading, mutate } = useSWR<{
    events: StripeWebhookEvent[]
    total: number
    stats: {
      received: number
      processed: number
      failed: number
    }
  }>(`/api/plugins/stripe/webhooks?page=${page}&pageSize=${pageSize}`, fetcher, {
    refreshInterval: 10000,
  })

  const events = data?.events || []
  const total = data?.total || 0
  const stats = data?.stats || { received: 0, processed: 0, failed: 0 }
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
          <h1 className="text-2xl font-semibold text-white">Webhooks</h1>
          <p className="text-sm text-zinc-400">View webhook events and logs</p>
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
            <p className="text-red-400">Failed to load webhook events</p>
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
          <h1 className="text-2xl font-semibold text-white">Webhooks</h1>
          <p className="text-sm text-zinc-400">View webhook events and logs</p>
        </div>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Received (24h)</span>
            <Clock className="h-5 w-5 text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{stats.received}</p>
        </div>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Processed (24h)</span>
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{stats.processed}</p>
        </div>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Failed (24h)</span>
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{stats.failed}</p>
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50">
        <table className="w-full">
          <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Event Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Event ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Received
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Processed
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {events.length > 0 ? (
              events.map((event) => <WebhookEventRow key={event.id} event={event} />)
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Webhook className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
                  <p className="text-zinc-400">No webhook events yet</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

export default function StripeWebhooksPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <StripeWebhooksContent />
    </Suspense>
  )
}
