'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export interface AuditEvent {
  id: string
  timestamp: string
  actorEmail: string
  type: string
  details: Record<string, unknown>
  ip: string
}

interface AuditEventRowProps {
  event: AuditEvent
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  login: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  logout: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
  'license.activate':
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  'license.deactivate':
    'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  'team.invite': 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  'team.revoke': 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  'settings.change': 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
}

export function AuditEventRow({ event }: AuditEventRowProps) {
  const [expanded, setExpanded] = useState(false)

  const colorClass =
    EVENT_TYPE_COLORS[event.type] ||
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'

  return (
    <>
      <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/30">
        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-zinc-600 dark:text-zinc-400">
          {new Date(event.timestamp).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-900 dark:text-white">
          {event.actorEmail}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
            {event.type}
          </span>
        </td>
        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-zinc-500">
          {event.ip}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={() => setExpanded(!expanded)}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} audit event ${new Date(event.timestamp).toLocaleString()}`}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Details
          </button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td
            colSpan={5}
            className="bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50"
          >
            <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 font-mono text-xs text-zinc-300">
              {JSON.stringify(event.details, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  )
}
