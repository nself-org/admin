'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ApiKey, ApiKeyScope, ApiKeyStatus } from '@/types/api-key'
import { formatDistanceToNow } from 'date-fns'
import {
  Activity,
  Clock,
  Key,
  MoreHorizontal,
  Pencil,
  ShieldOff,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ApiKeyCardProps {
  /** The API key data */
  apiKey: ApiKey
  /** Click handler for the card */
  onClick?: () => void
  /** Edit action handler */
  onEdit?: () => void
  /** Revoke action handler */
  onRevoke?: () => void
  /** Delete action handler */
  onDelete?: () => void
}

const statusConfig: Record<
  ApiKeyStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
  }
> = {
  active: {
    label: 'Active',
    variant: 'default',
    className: 'bg-green-500 hover:bg-green-500/80',
  },
  inactive: { label: 'Inactive', variant: 'secondary' },
  expired: {
    label: 'Expired',
    variant: 'outline',
    className: 'border-amber-500 text-amber-600',
  },
  revoked: { label: 'Revoked', variant: 'destructive' },
}

const scopeConfig: Record<ApiKeyScope, { label: string; className: string }> = {
  read: {
    label: 'Read',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  write: {
    label: 'Write',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  },
  admin: {
    label: 'Admin',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  },
  custom: {
    label: 'Custom',
    className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
}

export function ApiKeyCard({
  apiKey,
  onClick,
  onEdit,
  onRevoke,
  onDelete,
}: ApiKeyCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const statusStyle = statusConfig[apiKey.status]
  const scopeStyle = scopeConfig[apiKey.scope]
  const maskedKey = `nself_pk_${apiKey.keyPrefix}****`
  const isDisabled = apiKey.status === 'revoked' || apiKey.status === 'expired'

  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900',
        isDisabled && 'opacity-60',
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left side - Key info */}
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
              <Key className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {apiKey.name}
                </h4>
                <Badge
                  variant={statusStyle.variant}
                  className={cn('text-xs', statusStyle.className)}
                >
                  {statusStyle.label}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('border-0 text-xs', scopeStyle.className)}
                >
                  {scopeStyle.label}
                </Badge>
              </div>
              {apiKey.description && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {apiKey.description}
                </p>
              )}
              <code className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {maskedKey}
              </code>
            </div>
          </div>

          {/* Right side - Stats and actions */}
          <div className="flex items-start gap-4">
            {/* Stats */}
            <div className="hidden text-right sm:block">
              <div className="flex items-center justify-end gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                <Activity className="h-3 w-3" />
                <span>{apiKey.usageCount.toLocaleString()} requests</span>
              </div>
              {apiKey.lastUsedAt && (
                <div className="mt-1 flex items-center justify-end gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <Clock className="h-3 w-3" />
                  <span>
                    Last used{' '}
                    {formatDistanceToNow(new Date(apiKey.lastUsedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              )}
              {!apiKey.lastUsedAt && (
                <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Never used
                </div>
              )}
            </div>

            {/* Actions menu */}
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(!menuOpen)
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>

              {menuOpen && (
                <div className="absolute top-full right-0 z-50 mt-1 w-36 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onEdit?.()
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  {apiKey.status === 'active' && (
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-600 hover:bg-zinc-100 dark:text-amber-400 dark:hover:bg-zinc-800"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(false)
                        onRevoke?.()
                      }}
                    >
                      <ShieldOff className="h-4 w-4" />
                      Revoke
                    </button>
                  )}
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-zinc-100 dark:text-red-400 dark:hover:bg-zinc-800"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onDelete?.()
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
