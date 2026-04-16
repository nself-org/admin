'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Activity, ActivityAction, ActivityChange } from '@/types/activity'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronUp,
  Database,
  Key,
  LayoutDashboard,
  Link,
  Lock,
  Minus,
  Play,
  Plus,
  RefreshCw,
  Server,
  Settings,
  Square,
  User,
  Users,
  Workflow,
  Zap,
} from 'lucide-react'
import * as React from 'react'

/**
 * Single activity item display component
 *
 * @example
 * ```tsx
 * <ActivityItem
 *   activity={{
 *     id: '1',
 *     actor: { id: 'user1', type: 'user', name: 'John Doe' },
 *     action: 'started',
 *     resource: { id: 'postgres', type: 'service', name: 'PostgreSQL' },
 *     timestamp: '2024-01-15T10:30:00Z',
 *   }}
 * />
 * ```
 */

export interface ActivityItemProps {
  /** Activity data */
  activity: Activity
  /** Show full details */
  showDetails?: boolean
  /** Compact mode */
  compact?: boolean
  /** Additional class name */
  className?: string
}

/** Map action types to display colors */
const actionColors: Record<ActivityAction, string> = {
  created: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  deleted: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  viewed: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  started: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  stopped:
    'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  restarted:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  deployed:
    'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  rollback: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  login: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  logout: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  password_changed:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  invited: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  removed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  role_changed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  backup_created:
    'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  backup_restored:
    'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  config_changed:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  secret_accessed:
    'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
}

/** Map action types to display verbs */
const actionVerbs: Record<ActivityAction, string> = {
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
  viewed: 'viewed',
  started: 'started',
  stopped: 'stopped',
  restarted: 'restarted',
  deployed: 'deployed',
  rollback: 'rolled back',
  login: 'logged in',
  logout: 'logged out',
  password_changed: 'changed password',
  invited: 'invited',
  removed: 'removed',
  role_changed: 'changed role for',
  backup_created: 'created backup for',
  backup_restored: 'restored backup for',
  config_changed: 'changed config for',
  secret_accessed: 'accessed secret',
}

/** Get icon for actor type */
function getActorIcon(type: Activity['actor']['type']) {
  switch (type) {
    case 'user':
      return User
    case 'system':
      return Server
    case 'api':
      return Zap
    case 'workflow':
      return Workflow
    default:
      return User
  }
}

/** Get icon for resource type */
function getResourceIcon(type: Activity['resource']['type']) {
  switch (type) {
    case 'service':
      return Server
    case 'database':
      return Database
    case 'user':
      return User
    case 'tenant':
      return Users
    case 'organization':
      return Users
    case 'backup':
      return Database
    case 'deployment':
      return Play
    case 'config':
      return Settings
    case 'secret':
      return Lock
    case 'api_key':
      return Key
    case 'workflow':
      return Workflow
    case 'report':
      return LayoutDashboard
    case 'dashboard':
      return LayoutDashboard
    case 'notification':
      return Zap
    default:
      return Server
  }
}

/** Get icon for action */
function getActionIcon(action: ActivityAction) {
  switch (action) {
    case 'created':
      return Plus
    case 'deleted':
      return Minus
    case 'started':
      return Play
    case 'stopped':
      return Square
    case 'restarted':
      return RefreshCw
    default:
      return ArrowRight
  }
}

/** Render a single change diff */
function ChangeDiff({ change }: { change: ActivityChange }) {
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '(empty)'
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs dark:border-zinc-700 dark:bg-zinc-800">
      <div className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">
        {change.field}
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 line-through dark:bg-red-900 dark:text-red-300">
          {formatValue(change.oldValue)}
        </span>
        <ArrowRight className="h-3 w-3 text-zinc-400" />
        <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700 dark:bg-green-900 dark:text-green-300">
          {formatValue(change.newValue)}
        </span>
      </div>
    </div>
  )
}

export function ActivityItem({
  activity,
  showDetails = false,
  compact = false,
  className,
}: ActivityItemProps) {
  const [isExpanded, setIsExpanded] = React.useState(showDetails)

  const ActorIcon = getActorIcon(activity.actor.type)
  const ResourceIcon = getResourceIcon(activity.resource.type)
  const ActionIcon = getActionIcon(activity.action)
  const hasChanges = activity.changes && activity.changes.length > 0

  const timestamp = formatDistanceToNow(new Date(activity.timestamp), {
    addSuffix: true,
  })

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400',
          className,
        )}
      >
        <ActionIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-zinc-900 dark:text-zinc-50">
          {activity.actor.name}
        </span>
        <span>{actionVerbs[activity.action]}</span>
        <span className="font-medium text-zinc-900 dark:text-zinc-50">
          {activity.resource.name}
        </span>
        <span className="text-xs text-zinc-400">{timestamp}</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {/* Actor avatar */}
        <div className="flex-shrink-0">
          {activity.actor.avatarUrl ? (
            <img
              src={activity.actor.avatarUrl}
              alt={activity.actor.name}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              {activity.actor.type === 'system' ? (
                <Bot className="h-5 w-5 text-zinc-500" />
              ) : (
                <ActorIcon className="h-5 w-5 text-zinc-500" />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {activity.actor.name}
            </span>
            <Badge
              variant="secondary"
              className={cn('text-xs', actionColors[activity.action])}
            >
              {actionVerbs[activity.action]}
            </Badge>
            {activity.resource.url ? (
              <a
                href={activity.resource.url}
                className="inline-flex items-center gap-1 font-medium text-zinc-900 hover:underline dark:text-zinc-50"
              >
                <ResourceIcon className="h-3.5 w-3.5" />
                {activity.resource.name}
                <Link className="h-3 w-3 text-zinc-400" />
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-zinc-900 dark:text-zinc-50">
                <ResourceIcon className="h-3.5 w-3.5" />
                {activity.resource.name}
              </span>
            )}
            {activity.target && (
              <>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {activity.target.name}
                </span>
              </>
            )}
          </div>

          {/* Timestamp and metadata */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <time dateTime={activity.timestamp}>{timestamp}</time>
            {activity.actor.email && <span>{activity.actor.email}</span>}
            {activity.ipAddress && <span>IP: {activity.ipAddress}</span>}
          </div>

          {/* Changes diff */}
          {hasChanges && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {activity.changes!.length} change
                {activity.changes!.length !== 1 ? 's' : ''}
              </button>
              {isExpanded && (
                <div className="mt-2 space-y-2">
                  {activity.changes!.map((change, index) => (
                    <ChangeDiff key={index} change={change} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
