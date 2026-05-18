'use client'

import { cn } from '@/lib/utils'
import { FileText, Loader2, MoreVertical, Play, RotateCw, Square, Terminal } from 'lucide-react'
import { useState } from 'react'
import { Button } from './button'

/**
 * ServiceActions - Service action buttons (start/stop/restart/logs/details)
 *
 * @example
 * ```tsx
 * <ServiceActions
 *   status="running"
 *   onStart={() => handleAction('start')}
 *   onStop={() => handleAction('stop')}
 *   onRestart={() => handleAction('restart')}
 *   onLogs={() => handleAction('logs')}
 *   onTerminal={() => handleAction('terminal')}
 *   loading={isLoading}
 * />
 * ```
 */
export interface ServiceActionsProps {
  /** Service status */
  status: 'running' | 'stopped' | 'starting' | 'stopping'
  /** Start service handler */
  onStart?: () => void
  /** Stop service handler */
  onStop?: () => void
  /** Restart service handler */
  onRestart?: () => void
  /** View logs handler */
  onLogs?: () => void
  /** Open terminal handler */
  onTerminal?: () => void
  /** Show more actions menu */
  onMoreActions?: () => void
  /** Loading state */
  loading?: boolean
  /** Compact mode (icon buttons only) */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

export function ServiceActions({
  status,
  onStart,
  onStop,
  onRestart,
  onLogs,
  onTerminal,
  onMoreActions,
  loading = false,
  compact = false,
  className,
}: ServiceActionsProps) {
  const [showMenu, setShowMenu] = useState(false)
  const isRunning = status === 'running'
  const isTransitioning = status === 'starting' || status === 'stopping'

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {isRunning ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRestart}
              disabled={loading || isTransitioning}
              className="h-8 w-8 p-0"
              title="Restart"
              aria-label="Restart service"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onStop}
              disabled={loading || isTransitioning}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-400"
              title="Stop"
              aria-label="Stop service"
            >
              <Square className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onStart}
            disabled={loading || isTransitioning}
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 dark:text-green-400"
            title="Start"
            aria-label="Start service"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogs}
          disabled={loading}
          className="h-8 w-8 p-0"
          title="Logs"
          aria-label="View logs"
        >
          <FileText className="h-4 w-4" />
        </Button>
        {onTerminal && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onTerminal}
            disabled={loading || !isRunning}
            className="h-8 w-8 p-0"
            title="Terminal"
            aria-label="Open terminal"
          >
            <Terminal className="h-4 w-4" />
          </Button>
        )}
        {onMoreActions && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMenu(!showMenu)}
              className="h-8 w-8 p-0"
              title="More actions"
              aria-label="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  <button
                    onClick={() => {
                      onMoreActions()
                      setShowMenu(false)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
                  >
                    More Options
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isRunning ? (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onRestart}
            disabled={loading || isTransitioning}
            aria-label="Restart service"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="mr-2 h-4 w-4" />
            )}
            Restart
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            disabled={loading || isTransitioning}
            className="text-red-600 hover:text-red-700 dark:text-red-400"
            aria-label="Stop service"
          >
            <Square className="mr-2 h-4 w-4" />
            Stop
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onStart}
          disabled={loading || isTransitioning}
          className="text-green-600 hover:text-green-700 dark:text-green-400"
          aria-label="Start service"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Start
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onLogs}
        disabled={loading}
        aria-label="View logs"
      >
        <FileText className="mr-2 h-4 w-4" />
        Logs
      </Button>
      {onTerminal && (
        <Button
          variant="outline"
          size="sm"
          onClick={onTerminal}
          disabled={loading || !isRunning}
          aria-label="Open terminal"
        >
          <Terminal className="mr-2 h-4 w-4" />
          Terminal
        </Button>
      )}
    </div>
  )
}
