'use client'

import { Button } from '@/components/Button'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, Pause, Play } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LogEntry, LogLine } from './LogLine'

interface LogStreamProps {
  logs: LogEntry[]
  autoScroll?: boolean
  maxLogs?: number
  onAutoScrollChange?: (enabled: boolean) => void
}

export function LogStream({
  logs,
  autoScroll = true,
  maxLogs = 10000,
  onAutoScrollChange,
}: LogStreamProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = useState(!autoScroll)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Limit logs to maxLogs for performance
  const limitedLogs = useMemo(() => {
    if (logs.length > maxLogs) {
      return logs.slice(-maxLogs)
    }
    return logs
  }, [logs, maxLogs])

  // Virtualizer for efficient rendering
  const rowVirtualizer = useVirtualizer({
    count: limitedLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  })

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (!isPaused && parentRef.current && limitedLogs.length > 0) {
      const { scrollHeight, clientHeight } = parentRef.current
      parentRef.current.scrollTop = scrollHeight - clientHeight
    }
  }, [limitedLogs.length, isPaused])

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (!parentRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100

    setShowScrollButton(!isAtBottom && limitedLogs.length > 0)

    // Auto-pause if user scrolls up
    if (!isAtBottom && !isPaused) {
      setIsPaused(true)
      onAutoScrollChange?.(false)
    }
  }, [isPaused, onAutoScrollChange, limitedLogs.length])

  // Scroll to bottom manually
  const scrollToBottom = () => {
    if (parentRef.current) {
      const { scrollHeight, clientHeight } = parentRef.current
      parentRef.current.scrollTop = scrollHeight - clientHeight
      setIsPaused(false)
      onAutoScrollChange?.(true)
    }
  }

  // Toggle pause
  const togglePause = () => {
    const newPaused = !isPaused
    setIsPaused(newPaused)
    onAutoScrollChange?.(!newPaused)

    if (!newPaused) {
      scrollToBottom()
    }
  }

  return (
    <div className="relative h-full">
      {/* Pause/Resume Button */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          onClick={togglePause}
          variant={isPaused ? 'outline' : 'primary'}
          className="h-auto px-3 py-2 text-xs shadow-lg"
        >
          {isPaused ? (
            <>
              <Play className="mr-1 h-4 w-4" />
              Resume
            </>
          ) : (
            <>
              <Pause className="mr-1 h-4 w-4" />
              Pause
            </>
          )}
        </Button>

        {showScrollButton && (
          <Button
            onClick={scrollToBottom}
            variant="primary"
            className="h-auto px-3 py-2 text-xs shadow-lg"
          >
            <ChevronDown className="mr-1 h-4 w-4" />
            Scroll to Bottom
          </Button>
        )}
      </div>

      {/* Log Container */}
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="h-full overflow-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      >
        {limitedLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-zinc-500">
            <div className="text-center">
              <p className="text-sm">No logs yet</p>
              <p className="mt-1 text-xs text-zinc-400">
                Start a service to see logs
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const log = limitedLogs[virtualRow.index]
              if (!log) return null
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <LogLine log={log} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Buffer Warning */}
      {logs.length > maxLogs && (
        <div className="absolute bottom-4 left-4 rounded bg-yellow-500/90 px-3 py-1.5 text-xs text-yellow-900 shadow-lg">
          Buffer limit reached. Showing last {maxLogs.toLocaleString()} logs.
        </div>
      )}
    </div>
  )
}
