'use client'

import { useNotificationStats } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

interface NotificationBadgeProps {
  className?: string
  showZero?: boolean
}

export function NotificationBadge({ className, showZero = false }: NotificationBadgeProps) {
  const { unreadCount, isLoading } = useNotificationStats()

  if (isLoading || (!showZero && unreadCount === 0)) {
    return null
  }

  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString()

  return (
    <span
      className={cn(
        'absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white',
        className
      )}
    >
      {displayCount}
    </span>
  )
}
