'use client'

import clsx from 'clsx'
import { AlertTriangle, ArrowRight, MousePointer, Navigation } from 'lucide-react'

export interface RumEvent {
  id: string
  type: 'click' | 'navigation' | 'error' | 'custom'
  timestamp: string
  label: string
  errorMessage?: string
  url?: string
}

interface SessionReplayProps {
  sessionId: string
  events: RumEvent[]
  className?: string
}

const EVENT_ICON: Record<RumEvent['type'], React.ReactNode> = {
  click: <MousePointer className="h-3.5 w-3.5 text-blue-400" />,
  navigation: <Navigation className="h-3.5 w-3.5 text-indigo-400" />,
  error: <AlertTriangle className="h-3.5 w-3.5 text-red-400" />,
  custom: <ArrowRight className="h-3.5 w-3.5 text-nself-text-muted" />,
}

export function SessionReplay({
  sessionId,
  events,
  className,
}: SessionReplayProps) {
  if (events.length === 0) {
    return (
      <div
        className={clsx(
          'border-nself-border rounded-lg border p-4 text-center',
          className,
        )}
      >
        <p className="text-nself-text-muted text-xs">No events for session {sessionId}</p>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-1', className)}>
      <p className="text-nself-text-muted font-mono text-xs">
        Session {sessionId}
      </p>
      <ol className="space-y-0.5">
        {events.map((event) => (
          <li
            key={event.id}
            className={clsx(
              'border-nself-border flex items-start gap-2 rounded-lg border px-3 py-2',
              event.type === 'error' && 'border-red-500/30 bg-red-500/5',
            )}
          >
            <span className="mt-0.5 shrink-0">{EVENT_ICON[event.type]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-nself-text truncate text-xs font-medium">
                {event.label}
              </p>
              {event.url !== undefined && (
                <p className="text-nself-text-muted truncate font-mono text-xs">
                  {event.url}
                </p>
              )}
              {event.errorMessage !== undefined && (
                <p className="mt-0.5 truncate text-xs text-red-300">
                  {event.errorMessage}
                </p>
              )}
            </div>
            <span className="text-nself-text-muted shrink-0 font-mono text-xs">
              {new Date(event.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
