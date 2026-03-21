'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Download, Pause, Play, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface LogLine {
  id: string
  text: string
  timestamp: string
  level?: 'info' | 'warn' | 'error' | 'debug'
}

interface LogViewerProps {
  logs: LogLine[]
  className?: string
  maxHeight?: string
}

export function LogViewer({
  logs,
  className,
  maxHeight = '500px',
}: LogViewerProps) {
  const [autoScroll, setAutoScroll] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Download logs as text file
  const handleDownload = () => {
    const logText = logs
      .map((log) => `[${log.timestamp}] ${log.text}`)
      .join('\n')
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `build-logs-${new Date().toISOString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filter logs by search query
  const filteredLogs = searchQuery
    ? logs.filter((log) =>
        log.text.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : logs

  // Syntax highlighting for error/warning lines
  const getLogLineClass = (log: LogLine) => {
    const text = log.text.toLowerCase()
    if (
      log.level === 'error' ||
      text.includes('error') ||
      text.includes('fail')
    ) {
      return 'text-red-400'
    }
    if (log.level === 'warn' || text.includes('warn')) {
      return 'text-yellow-400'
    }
    if (log.level === 'debug') {
      return 'text-zinc-500'
    }
    return 'text-zinc-200'
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-zinc-200 dark:border-zinc-800',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Build Logs
          </span>
          <span className="text-xs text-zinc-500">
            ({filteredLogs.length}{' '}
            {filteredLogs.length === 1 ? 'line' : 'lines'})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Search Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="h-8 w-8 p-0"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Auto-scroll Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className="h-8 w-8 p-0"
            title={autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
          >
            {autoScroll ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          {/* Download */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 w-8 p-0"
            disabled={logs.length === 0}
            title="Download logs"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pr-8 pl-9 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Log Content */}
      <div
        ref={logContainerRef}
        className="overflow-y-auto bg-zinc-950 p-4 font-mono text-sm dark:bg-black"
        style={{ maxHeight }}
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-zinc-500">
            {searchQuery ? 'No logs match your search' : 'No logs yet'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={cn('flex gap-3', getLogLineClass(log))}
              >
                <span className="flex-shrink-0 text-zinc-600">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="flex-1 break-all">{log.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
