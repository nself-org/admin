'use client'

import { formatDistanceToNow } from 'date-fns'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { memo } from 'react'

export interface LogEntry {
  id: string
  service: string
  line: string
  timestamp: string
  level?: 'info' | 'warn' | 'error' | 'debug'
  source?: 'stdout' | 'stderr'
}

interface LogLineProps {
  log: LogEntry
  showService?: boolean
}

const levelConfig = {
  info: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  warn: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
  debug: {
    icon: Info,
    color: 'text-gray-500',
    bg: 'bg-gray-50 dark:bg-gray-900/20',
  },
}

const serviceColors = [
  'text-sky-500',
  'text-blue-500',
  'text-green-500',
  'text-yellow-500',
  'text-pink-500',
  'text-cyan-500',
  'text-orange-500',
  'text-sky-500',
]

function getServiceColor(service: string): string {
  const hash = service
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return serviceColors[hash % serviceColors.length]
}

function tryParseJSON(line: string): { parsed: boolean; content: string } {
  try {
    const json = JSON.parse(line)
    return { parsed: true, content: JSON.stringify(json, null, 2) }
  } catch {
    return { parsed: false, content: line }
  }
}

export const LogLine = memo(function LogLine({
  log,
  showService = true,
}: LogLineProps) {
  const config = levelConfig[log.level || 'info']
  const Icon = config.icon
  const timestamp = new Date(log.timestamp)
  const { parsed, content } = tryParseJSON(log.line)

  return (
    <div className="flex gap-2 border-b border-zinc-100 px-4 py-2 font-mono text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">
      {/* Timestamp */}
      <div className="w-24 flex-shrink-0 text-xs text-zinc-500">
        <div>{timestamp.toLocaleTimeString()}</div>
        <div className="text-[10px] text-zinc-400">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </div>
      </div>

      {/* Level Badge */}
      <div className="flex-shrink-0">
        <div
          className={`flex items-center gap-1 rounded px-2 py-0.5 ${config.bg}`}
        >
          <Icon className={`h-3 w-3 ${config.color}`} />
          <span
            className={`text-[10px] font-semibold uppercase ${config.color}`}
          >
            {log.level || 'info'}
          </span>
        </div>
      </div>

      {/* Service Name */}
      {showService && (
        <div className="w-24 flex-shrink-0">
          <span
            className={`text-xs font-semibold ${getServiceColor(log.service)}`}
          >
            {log.service}
          </span>
        </div>
      )}

      {/* Message */}
      <div className="min-w-0 flex-1">
        {parsed ? (
          <pre className="overflow-x-auto text-xs whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {content}
          </pre>
        ) : (
          <div className="text-xs break-all text-zinc-700 dark:text-zinc-300">
            {content}
          </div>
        )}
      </div>
    </div>
  )
})
