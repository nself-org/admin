'use client'

import { cn } from '@/lib/utils'
import { Copy, Download, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from './button'
import { Input } from './input'
import { ScrollArea } from './scroll-area'

/**
 * LogViewer - Log display component with search, filter, and download
 *
 * @example
 * ```tsx
 * <LogViewer
 *   logs={logsArray}
 *   title="Service Logs"
 *   live={true}
 *   onRefresh={() => fetchLogs()}
 * />
 * ```
 */
export interface LogViewerProps {
  /** Log entries (array of strings or objects with timestamp/message) */
  logs: string[] | Array<{ timestamp?: string; level?: string; message: string }>
  /** Title for the log viewer */
  title?: string
  /** Enable live mode (auto-scroll to bottom) */
  live?: boolean
  /** Enable search */
  searchable?: boolean
  /** Enable download */
  downloadable?: boolean
  /** Height of viewer */
  height?: string
  /** Refresh handler */
  onRefresh?: () => void
  /** Additional CSS classes */
  className?: string
}

export function LogViewer({
  logs,
  title = 'Logs',
  live = false,
  searchable = true,
  downloadable = true,
  height = '400px',
  onRefresh: _onRefresh,
  className,
}: LogViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [autoScroll, setAutoScroll] = useState(live)
  const endRef = useRef<HTMLDivElement>(null)

  const normalizedLogs = logs.map((log) => {
    if (typeof log === 'string') {
      return { message: log }
    }
    return log
  })

  const filteredLogs = searchTerm
    ? normalizedLogs.filter((log) => log.message.toLowerCase().includes(searchTerm.toLowerCase()))
    : normalizedLogs

  useEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [filteredLogs, autoScroll])

  const handleCopy = () => {
    const text = filteredLogs.map((log) => log.message).join('\n')
    navigator.clipboard.writeText(text)
  }

  const handleDownload = () => {
    const text = filteredLogs.map((log) => log.message).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getLevelColor = (level?: string) => {
    if (!level) return ''
    const l = level.toLowerCase()
    if (l === 'error' || l === 'fatal') return 'text-red-500 dark:text-red-400'
    if (l === 'warn' || l === 'warning') return 'text-yellow-500 dark:text-yellow-400'
    if (l === 'info') return 'text-blue-500 dark:text-blue-400'
    if (l === 'debug') return 'text-zinc-500 dark:text-zinc-400'
    return 'text-green-500 dark:text-green-400'
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h3 className="font-semibold text-zinc-900 dark:text-white">{title}</h3>
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="relative">
              <Search className="absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-48 pr-8 pl-8"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 w-8 p-0"
            title="Copy logs"
            aria-label="Copy logs"
          >
            <Copy className="h-4 w-4" />
          </Button>
          {downloadable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 w-8 p-0"
              title="Download logs"
              aria-label="Download logs"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            Auto-scroll
          </label>
        </div>
      </div>

      {/* Log Content */}
      <ScrollArea className="flex-1" style={{ height }}>
        <div className="p-4 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-zinc-500 dark:text-zinc-400">
              {searchTerm ? 'No logs match your search' : 'No logs available'}
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index} className="mb-1 flex gap-2 break-all whitespace-pre-wrap">
                {log.timestamp && (
                  <span className="text-zinc-500 dark:text-zinc-400">[{log.timestamp}]</span>
                )}
                {log.level && (
                  <span className={cn('font-semibold', getLevelColor(log.level))}>
                    {log.level.toUpperCase()}
                  </span>
                )}
                <span className="flex-1 text-zinc-900 dark:text-zinc-100">{log.message}</span>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
