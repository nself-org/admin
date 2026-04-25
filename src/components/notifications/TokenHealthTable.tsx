'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { type DeviceToken } from '@/lib/api/notifications'
import { Smartphone, Trash2 } from 'lucide-react'

export interface TokenHealthTableProps {
  tokens: DeviceToken[]
  isLoading?: boolean
  onBulkInvalidate?: (ids: string[]) => void
}

export function TokenHealthTable({
  tokens,
  isLoading,
  onBulkInvalidate,
}: TokenHealthTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className="h-10 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <EmptyState
        icon={Smartphone}
        title="No device tokens"
        description="Tokens appear here once users install the app and allow notifications."
        className="border-dashed"
      />
    )
  }

  const invalidIds = tokens.filter((t) => !t.valid).map((t) => t.id)

  return (
    <div>
      {invalidIds.length > 0 && onBulkInvalidate && (
        <div className="mb-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkInvalidate(invalidIds)}
            className="text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Purge {invalidIds.length} invalid
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-left">Token</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Platform</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {tokens.map((token) => (
              <tr
                key={token.id}
                className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              >
                <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {token.token.slice(0, 12)}…
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {token.userId || <span className="text-zinc-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs uppercase">
                    {token.platform}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {token.valid ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      Valid
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      Invalid
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                  {token.lastSeen
                    ? new Date(token.lastSeen).toLocaleDateString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
