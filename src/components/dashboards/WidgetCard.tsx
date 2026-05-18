'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Widget } from '@/types/dashboard'
import * as Popover from '@radix-ui/react-popover'
import {
  GripVertical,
  Maximize2,
  Minimize2,
  MoreVertical,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { useCallback, useState } from 'react'

interface WidgetCardProps {
  widget: Widget
  editable?: boolean
  children: React.ReactNode
  onRemove?: () => void
  onEdit?: () => void
  onRefresh?: () => void
  className?: string
}

export function WidgetCard({
  widget,
  editable = false,
  children,
  onRemove,
  onEdit,
  onRefresh,
  className,
}: WidgetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh])

  const title = widget.config.title
  const subtitle = widget.config.subtitle
  const hasHeader = title || subtitle || editable

  return (
    <>
      {/* Expanded overlay */}
      {isExpanded && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsExpanded(false)} />
      )}

      <div
        className={cn(
          'flex h-full flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-all dark:border-zinc-800 dark:bg-zinc-950',
          isExpanded && 'fixed inset-4 z-50 h-auto',
          editable && 'ring-2 ring-transparent hover:ring-blue-500/50',
          className
        )}
      >
        {/* Header */}
        {hasHeader && (
          <div className="flex items-center justify-between border-b px-4 py-3 dark:border-zinc-800">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {editable && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-zinc-400" />}
              <div className="min-w-0 flex-1">
                {title && (
                  <h3 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1">
              {/* Expand/Collapse button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Minimize' : 'Maximize'}
              >
                {isExpanded ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>

              {/* More options menu */}
              <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
                <Popover.Trigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="More options">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    className="z-50 w-40 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
                    sideOffset={4}
                    align="end"
                  >
                    {onRefresh && (
                      <button
                        onClick={() => {
                          handleRefresh()
                          setMenuOpen(false)
                        }}
                        disabled={isRefreshing}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                        Refresh
                      </button>
                    )}
                    {editable && onEdit && (
                      <button
                        onClick={() => {
                          onEdit()
                          setMenuOpen(false)
                        }}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                    {editable && onRemove && (
                      <button
                        onClick={() => {
                          onRemove()
                          setMenuOpen(false)
                        }}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    )}
                    <Popover.Arrow className="fill-white dark:fill-zinc-950" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>

        {/* Refresh interval indicator */}
        {widget.config.dataSource?.refreshInterval && (
          <div className="border-t px-4 py-1.5 dark:border-zinc-800">
            <p className="text-xs text-zinc-400">
              Auto-refresh: {widget.config.dataSource.refreshInterval}s
            </p>
          </div>
        )}
      </div>
    </>
  )
}
