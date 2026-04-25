'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { DLQEntry } from './types'

interface DLQPanelProps {
  entries: DLQEntry[]
  isLoading?: boolean
  onReEnqueue: (id: string) => Promise<void>
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

/**
 * DLQPanel shows dead-letter queue entries and provides a re-enqueue button per row.
 * Re-enqueue resets attempt_count and re-queues the delivery within 5 seconds.
 */
export function DLQPanel({
  entries,
  isLoading = false,
  onReEnqueue,
}: DLQPanelProps) {
  const [pending, setPending] = useState<Record<string, boolean>>({})

  const handleReEnqueue = async (id: string) => {
    setPending((p) => ({ ...p, [id]: true }))
    try {
      await onReEnqueue(id)
    } finally {
      setPending((p) => ({ ...p, [id]: false }))
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Dead-letter queue is empty.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
          <tr>
            {[
              'Delivery ID',
              'Endpoint ID',
              'Error',
              'Quarantined At',
              'Re-enqueued At',
              '',
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
          {entries.map((e) => (
            <tr
              key={e.id}
              className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
            >
              <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {e.deliveryId.slice(0, 8)}…
              </td>
              <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {e.endpointId.slice(0, 8)}…
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-xs text-red-600 dark:text-red-400">
                {e.finalError || '—'}
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                {formatDate(e.quarantinedAt)}
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                {e.reEnqueuedAt ? (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {formatDate(e.reEnqueuedAt)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => handleReEnqueue(e.id)}
                  disabled={!!e.reEnqueuedAt || pending[e.id]}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
                  title="Re-enqueue this delivery for immediate retry"
                >
                  <RotateCcw
                    className={`h-3.5 w-3.5 ${pending[e.id] ? 'animate-spin' : ''}`}
                  />
                  {pending[e.id] ? 'Queuing…' : 'Re-enqueue'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
