'use client'

import { formatDistanceToNow } from 'date-fns'
import {
  CheckCircle,
  Info,
  Play,
  RotateCw,
  Square,
  Terminal,
  XCircle,
} from 'lucide-react'

export interface ActivityEvent {
  id: string
  type: 'start' | 'stop' | 'restart' | 'deploy' | 'error' | 'info' | 'success'
  service?: string
  message: string
  timestamp: string
  user?: string
  details?: string
}

interface ActivityFeedProps {
  events: ActivityEvent[]
  maxEvents?: number
}

export function ActivityFeed({ events, maxEvents = 10 }: ActivityFeedProps) {
  const displayEvents = events.slice(0, maxEvents)

  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'start':
        return <Play className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'stop':
        return <Square className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'restart':
        return <RotateCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      case 'deploy':
        return (
          <Terminal className="h-4 w-4 text-sky-500 dark:text-sky-400" />
        )
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'success':
        return (
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        )
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    }
  }

  const getEventColor = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20'
      case 'success':
      case 'start':
        return 'border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-950/20'
      case 'stop':
        return 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20'
      case 'restart':
      case 'deploy':
        return 'border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/20'
      case 'info':
      default:
        return 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return 'recently'
    }
  }

  if (displayEvents.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900/50">
        <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
          Recent Activity
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Info className="mb-3 h-8 w-8 text-zinc-400" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No recent activity
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            Service events will appear here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
        Recent Activity
      </h3>

      <div className="space-y-2">
        {displayEvents.map((event, index) => (
          <div
            key={event.id || index}
            className={`rounded-lg border p-3 transition-colors ${getEventColor(event.type)}`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="mt-0.5 flex-shrink-0">
                {getEventIcon(event.type)}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {event.message}
                    </p>
                    {event.service && (
                      <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                        Service: {event.service}
                      </p>
                    )}
                    {event.details && (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                        {event.details}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="flex-shrink-0 text-xs text-zinc-500 dark:text-zinc-500">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>

                {/* User Attribution */}
                {event.user && (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                    by {event.user}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {events.length > maxEvents && (
        <div className="mt-3 text-center">
          <button className="text-xs text-blue-600 hover:underline dark:text-blue-400">
            View all {events.length} events
          </button>
        </div>
      )}
    </div>
  )
}
