'use client'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useNotificationsWithActions } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import { Bell, Check, Loader2, Settings } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { NotificationBadge } from './NotificationBadge'
import { NotificationItem } from './NotificationItem'

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const {
    notifications,
    unreadCount,
    isLoading,
    isMarkingAllRead,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationsWithActions({ limit: 10 })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        <NotificationBadge />
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <Card className="absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden p-0 shadow-lg sm:w-96">
          {/* Header */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b p-4">
            <CardTitle className="text-base font-semibold">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {unreadCount} new
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllRead}
                  className="h-8 text-xs"
                >
                  {isMarkingAllRead ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-3 w-3" />
                  )}
                  Mark all read
                </Button>
              )}
              <Link
                href="/settings/notifications"
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Notification settings</span>
              </Link>
            </div>
          </CardHeader>

          {/* Notification List */}
          <CardContent className="p-0">
            <ScrollArea className="max-h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    No notifications yet
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    We&apos;ll let you know when something happens
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            {notifications.length > 0 && (
              <>
                <Separator />
                <div className="p-2">
                  <Link
                    href="/notifications"
                    className={cn(
                      buttonVariants({ variant: 'ghost' }),
                      'w-full justify-center text-sm'
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
