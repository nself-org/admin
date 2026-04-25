'use client'

import { CheckCircle, Clock, RefreshCw, XCircle } from 'lucide-react'
import { DeliveryStatus, WebhookDelivery } from './types'

interface DeliveryLogProps {
  deliveries: WebhookDelivery[]
  isLoading?: boolean
}

const STATUS_ICON: Record<DeliveryStatus, React.ReactNode> = {
  delivered: (
    <CheckCircle className="h-4 w-4 text-emerald-500" aria-label="Delivered" />
  ),
  failed: <XCircle className="h-4 w-4 text-red-500" aria-label="Failed" />,
  retrying: (
    <RefreshCw
      className="h-4 w-4 animate-spin text-amber-500"
      aria-label="Retrying"
    />
  ),
  pending: <Clock className="h-4 w-4 text-zinc-400" aria-label="Pending" />,
}

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  delivered: 'Delivered',
  failed: 'Failed',
  retrying: 'Retrying',
  pending: 'Pending',
}

function formatMs(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

/**
 * DeliveryLog renders a table of webhook delivery attempts with status,
 * attempt count, response code, and latency.
 */
export function DeliveryLog({
  deliveries,
  isLoading = false,
}: DeliveryLogProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
    )
  }

  if (deliveries.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No deliveries yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
          <tr>
            {[
              'Status',
              'Event',
              'Attempt',
              'Code',
              'Latency',
              'Signed',
              'Next Retry',
              'Sent At',
            ].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-zinc-500 uppercase dark:text-zinc-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
          {deliveries.map((d) => (
            <tr
              key={d.id}
              className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            >
              <td className="px-4 py-3">
                <span className="flex items-center gap-1.5">
                  {STATUS_ICON[d.status]}
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {STATUS_LABEL[d.status]}
                  </span>
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {d.eventName}
              </td>
              <td className="px-4 py-3 text-center text-zinc-600 tabular-nums dark:text-zinc-400">
                {d.attemptCount}
              </td>
              <td className="px-4 py-3 tabular-nums">
                {d.statusCode !== null ? (
                  <span
                    className={
                      d.statusCode >= 200 && d.statusCode < 300
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }
                  >
                    {d.statusCode}
                  </span>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-zinc-600 tabular-nums dark:text-zinc-400">
                {formatMs(d.responseMs)}
              </td>
              <td className="px-4 py-3 text-center">
                {d.signed ? (
                  <CheckCircle className="mx-auto h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="mx-auto h-4 w-4 text-zinc-300 dark:text-zinc-600" />
                )}
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                {d.nextRetryAt ? formatDate(d.nextRetryAt) : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                {formatDate(d.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
