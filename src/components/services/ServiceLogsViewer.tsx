'use client'

import { Button } from '@/components/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWebSocket } from '@/hooks/useWebSocket'
import { EventType, LogStreamEvent } from '@/lib/websocket/events'
import { Download, Pause, Play, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface LogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  service?: string
}

interface ServiceLogsViewerProps {
  serviceName: string
  logs: LogEntry[]
  onRefresh?: () => void
  onClear?: () => void
  onDownload?: () => void
  autoScroll?: boolean
  streaming?: boolean
  onToggleStreaming?: () => void
}

export function ServiceLogsViewer({
  serviceName,
  logs,
  onRefresh,
  onClear,
  onDownload,
  autoScroll = true,
  streaming = false,
  onToggleStreaming,
}: ServiceLogsViewerProps) {
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [realtimeLogs, setRealtimeLogs] = useState<LogEntry[]>([])
  const [isStreaming, setIsStreaming] = useState(streaming)

  // WebSocket for real-time log streaming
  const { on, connected, reconnecting } = useWebSocket()

  // Subscribe to real-time log stream
  useEffect(() => {
    if (!connected || !isStreaming) return

    const unsubscribe = on<LogStreamEvent>(EventType.LOGS_STREAM, (data) => {
      // Only process logs for this service
      if (data.service !== serviceName) return

      const newLog: LogEntry = {
        timestamp: data.timestamp,
        level: data.level || 'info',
        message: data.line,
        service: data.service,
      }

      setRealtimeLogs((prev) => [...prev, newLog])
    })

    return () => {
      unsubscribe()
    }
  }, [connected, isStreaming, serviceName, on])

  // Merge static logs with real-time logs
  const allLogs = [...logs, ...realtimeLogs]

  const filteredLogs = allLogs.filter((log) => {
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter
    const matchesSearch =
      searchTerm === '' || log.message.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesLevel && matchesSearch
  })

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [allLogs, autoScroll])

  // Handle toggle streaming
  const handleToggleStreaming = () => {
    setIsStreaming(!isStreaming)
    if (onToggleStreaming) {
      onToggleStreaming()
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-500'
      case 'warn':
        return 'text-yellow-500'
      case 'info':
        return 'text-blue-500'
      case 'debug':
        return 'text-zinc-500'
      default:
        return 'text-zinc-400'
    }
  }

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-500/10'
      case 'warn':
        return 'bg-yellow-500/10'
      case 'info':
        return 'bg-blue-500/10'
      case 'debug':
        return 'bg-zinc-500/10'
      default:
        return 'bg-zinc-500/10'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{serviceName} Logs</CardTitle>
          <div className="flex items-center gap-2">
            {/* WebSocket connection indicator */}
            <div
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
                connected
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : reconnecting
                    ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}
              title={connected ? 'Live streaming' : reconnecting ? 'Reconnecting...' : 'Offline'}
            >
              {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            </div>

            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-700"
            />
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Log level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleToggleStreaming} variant="outline" className="text-xs">
              {isStreaming ? (
                <>
                  <Pause className="mr-1 h-3 w-3" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-1 h-3 w-3" />
                  Stream
                </>
              )}
            </Button>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" className="text-xs">
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            {onDownload && (
              <Button onClick={onDownload} variant="outline" className="text-xs">
                <Download className="h-3 w-3" />
              </Button>
            )}
            {onClear && (
              <Button onClick={onClear} variant="outline" className="text-xs">
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-zinc-200 bg-zinc-950 dark:border-zinc-700">
          <ScrollArea className="h-[400px] w-full">
            <div ref={scrollRef} className="space-y-1 p-4">
              {filteredLogs.length === 0 ? (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  No logs to display
                </div>
              ) : (
                filteredLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 rounded px-2 py-1 font-mono text-xs ${getLevelBg(log.level)}`}
                  >
                    <span className="text-zinc-400">{log.timestamp}</span>
                    <span className={`w-12 uppercase ${getLevelColor(log.level)}`}>
                      {log.level}
                    </span>
                    <span className="flex-1 text-zinc-300">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Showing {filteredLogs.length} of {allLogs.length} log entries
            {realtimeLogs.length > 0 && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                ({realtimeLogs.length} live)
              </span>
            )}
          </span>
          {isStreaming && connected && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              Live streaming
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
