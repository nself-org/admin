'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types/notification'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
  Settings,
  X,
} from 'lucide-react'

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead?: (id: string) => void
  onDelete?: (id: string) => void
  compact?: boolean
}

const typeConfig: Record<NotificationType, { icon: typeof Info; color: string; bgColor: string }> =
  {
    info: {
      icon: Info,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    success: {
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950',
    },
    system: {
      icon: Settings,
      color: 'text-zinc-500',
      bgColor: 'bg-zinc-50 dark:bg-zinc-900',
    },
  }

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) {
    return 'Just now'
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString()
  }
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  compact = false,
}: NotificationItemProps) {
  const config = typeConfig[notification.type]
  const Icon = config.icon

  const handleClick = () => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id)
    }
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank')
    }
  }

  return (
    <div
      className={cn(
        'group relative flex gap-3 rounded-lg p-3 transition-colors',
        !notification.read && 'bg-zinc-50 dark:bg-zinc-900',
        notification.actionUrl && 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800'
      )}
      onClick={handleClick}
    >
      {/* Type Icon */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          config.bgColor
        )}
      >
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-sm font-medium',
                !notification.read
                  ? 'text-zinc-900 dark:text-zinc-50'
                  : 'text-zinc-700 dark:text-zinc-300'
              )}
            >
              {notification.title}
            </p>
            {!compact && (
              <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                {notification.message}
              </p>
            )}
          </div>

          {/* Delete button */}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(notification.id)
              }}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Delete notification</span>
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {formatTimeAgo(notification.createdAt)}
          </span>

          {/* Unread indicator */}
          {!notification.read && <span className="h-2 w-2 rounded-full bg-blue-500" />}

          {/* Action button */}
          {notification.actionUrl && notification.actionLabel && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                window.open(notification.actionUrl, '_blank')
              }}
            >
              {notification.actionLabel}
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          )}

          {/* Priority indicator for high/urgent */}
          {(notification.priority === 'high' || notification.priority === 'urgent') && (
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-xs font-medium',
                notification.priority === 'urgent'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
              )}
            >
              {notification.priority}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
