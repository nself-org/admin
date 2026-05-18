'use client'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiKeys } from '@/hooks/useApiKeys'
import { Key, Plus, RefreshCw } from 'lucide-react'
import { ApiKeyCard } from './ApiKeyCard'

interface ApiKeyListProps {
  /** Tenant ID to filter keys */
  tenantId?: string
  /** Callback when create button is clicked */
  onCreateClick?: () => void
  /** Callback when a key is selected */
  onKeySelect?: (keyId: string) => void
  /** Callback when edit is requested */
  onEditClick?: (keyId: string) => void
  /** Callback when revoke is requested */
  onRevokeClick?: (keyId: string) => void
  /** Callback when delete is requested */
  onDeleteClick?: (keyId: string) => void
}

export function ApiKeyList({
  tenantId,
  onCreateClick,
  onKeySelect,
  onEditClick,
  onRevokeClick,
  onDeleteClick,
}: ApiKeyListProps) {
  const { apiKeys, isLoading, isError, error, refresh } = useApiKeys(tenantId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-800 dark:bg-red-950">
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load API keys: {error}</p>
        <Button variant="outline" size="sm" onClick={() => refresh()} className="mt-2">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">API Keys</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={onCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Create Key
          </Button>
        </div>
      </div>

      {apiKeys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <Key className="mx-auto h-12 w-12 text-zinc-400" />
          <h4 className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">No API Keys</h4>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create your first API key to enable programmatic access.
          </p>
          <Button onClick={onCreateClick} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {apiKeys.map((key) => (
            <ApiKeyCard
              key={key.id}
              apiKey={key}
              onClick={() => onKeySelect?.(key.id)}
              onEdit={() => onEditClick?.(key.id)}
              onRevoke={() => onRevokeClick?.(key.id)}
              onDelete={() => onDeleteClick?.(key.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
