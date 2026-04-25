'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Timeline, TimelineItem } from '@/components/ui/timeline'
import { useActivityFeed } from '@/hooks/useActivity'
import { cn } from '@/lib/utils'
import type {
  Activity,
  ActivityAction,
  ActivityResourceType,
  ActivityFilter as FilterType,
} from '@/types/activity'
import {
  format,
  formatDistanceToNow,
  isSameDay,
  isToday,
  isYesterday,
} from 'date-fns'
import {
  Database,
  Key,
  LayoutDashboard,
  Lock,
  LucideIcon,
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
 * Timeline visualization for activity feed
 *
 * @example
 * ```tsx
 * <ActivityTimeline
 *   resourceType="service"
 *   limit={10}
 *   groupByDate
 * />
 * ```
 */

export interface ActivityTimelineProps {
  /** Filter by resource type */
  resourceType?: ActivityResourceType
  /** Filter by resource ID */
  resourceId?: string
  /** Custom filter */
  filter?: FilterType
  /** Number of activities to load */
  limit?: number
  /** Group activities by date */
  groupByDate?: boolean
  /** Show connecting lines */
  showLines?: boolean
  /** Additional class name */
  className?: string
}

/** Map action types to timeline variants */
const actionVariants: Record<
  ActivityAction,
  'default' | 'success' | 'warning' | 'danger'
> = {
  created: 'success',
  updated: 'default',
  deleted: 'danger',
  viewed: 'default',
  started: 'success',
  stopped: 'warning',
  restarted: 'warning',
  deployed: 'success',
  rollback: 'danger',
  login: 'default',
  logout: 'default',
  password_changed: 'warning',
  invited: 'success',
  removed: 'danger',
  role_changed: 'default',
  backup_created: 'success',
  backup_restored: 'success',
  config_changed: 'warning',
  secret_accessed: 'warning',
}

/** Map action types to icons */
const actionIcons: Record<ActivityAction, LucideIcon> = {
  created: Plus,
  updated: RefreshCw,
  deleted: Minus,
  viewed: LayoutDashboard,
  started: Play,
  stopped: Square,
  restarted: RefreshCw,
  deployed: Zap,
  rollback: RefreshCw,
  login: User,
  logout: User,
  password_changed: Lock,
  invited: Users,
  removed: Users,
  role_changed: Users,
  backup_created: Database,
  backup_restored: Database,
  config_changed: Settings,
  secret_accessed: Lock,
}

/** Map resource types to icons */
const resourceIcons: Record<string, LucideIcon> = {
  service: Server,
  database: Database,
  user: User,
  tenant: Users,
  organization: Users,
  backup: Database,
  deployment: Play,
  config: Settings,
  secret: Lock,
  api_key: Key,
  workflow: Workflow,
  report: LayoutDashboard,
  dashboard: LayoutDashboard,
  notification: Zap,
}

/** Format date header */
function formatDateHeader(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMMM d, yyyy')
}

/** Build activity title */
function buildTitle(activity: Activity): string {
  const { actor, action, resource, target } = activity
  const actionVerb = action.replace(/_/g, ' ')

  let title = `${actor.name} ${actionVerb} ${resource.name}`
  if (target) {
    title += ` to ${target.name}`
  }

  return title
}

/** Build activity description */
function buildDescription(activity: Activity): string | undefined {
  if (activity.changes && activity.changes.length > 0) {
    const changeCount = activity.changes.length
    return `${changeCount} field${changeCount !== 1 ? 's' : ''} changed`
  }

  if (activity.metadata && typeof activity.metadata === 'object') {
    const details = Object.entries(activity.metadata)
      .filter(([_, value]) => value !== null && value !== undefined)
      .slice(0, 2)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')

    return details || undefined
  }

  return undefined
}

/** Get icon for activity */
function getActivityIcon(activity: Activity): LucideIcon {
  // Prefer action icon for certain actions
  if (
    ['started', 'stopped', 'restarted', 'deployed', 'rollback'].includes(
      activity.action,
    )
  ) {
    return actionIcons[activity.action]
  }

  // Otherwise use resource type icon
  return resourceIcons[activity.resource.type] || Server
}

/** Loading skeleton for timeline */
function TimelineSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Date group header */
function DateHeader({ date }: { date: Date }) {
  return (
    <div className="mt-6 mb-4 first:mt-0">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {formatDateHeader(date)}
      </h3>
      <div className="mt-1 h-px bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

export function ActivityTimeline({
  resourceType,
  resourceId,
  filter = {},
  limit = 20,
  groupByDate = true,
  showLines = true,
  className,
}: ActivityTimelineProps) {
  // Merge external filters
  const mergedFilter: FilterType = React.useMemo(
    () => ({
      ...filter,
      resourceType: resourceType || filter.resourceType,
      resourceId: resourceId || filter.resourceId,
    }),
    [filter, resourceType, resourceId],
  )

  const { activities, isLoading, isError } = useActivityFeed({
    filter: mergedFilter,
    limit,
    includeChanges: true,
  })

  // Group activities by date if enabled
  // Must be declared before early returns to satisfy rules-of-hooks
  const groupedActivities = React.useMemo(() => {
    if (!groupByDate) {
      return [{ date: null, activities }]
    }

    const groups: { date: Date; activities: Activity[] }[] = []
    let currentGroup: { date: Date; activities: Activity[] } | null = null

    for (const activity of activities) {
      const activityDate = new Date(activity.timestamp)

      if (!currentGroup || !isSameDay(currentGroup.date, activityDate)) {
        currentGroup = { date: activityDate, activities: [] }
        groups.push(currentGroup)
      }

      currentGroup.activities.push(activity)
    }

    return groups
  }, [activities, groupByDate])

  if (isLoading) {
    return <TimelineSkeleton />
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
        Failed to load activity timeline
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <Zap className="mx-auto h-8 w-8 text-zinc-400" />
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          No activity to display
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {groupedActivities.map((group, groupIndex) => (
        <div key={group.date?.toISOString() || 'all'}>
          {group.date && groupByDate && <DateHeader date={group.date} />}

          <Timeline>
            {group.activities.map((activity, index) => {
              const Icon = getActivityIcon(activity)
              const isLast =
                groupIndex === groupedActivities.length - 1 &&
                index === group.activities.length - 1

              return (
                <TimelineItem
                  key={activity.id}
                  title={buildTitle(activity)}
                  description={buildDescription(activity)}
                  timestamp={formatDistanceToNow(new Date(activity.timestamp), {
                    addSuffix: true,
                  })}
                  icon={Icon}
                  variant={actionVariants[activity.action]}
                  showLine={showLines && !isLast}
                >
                  {/* Render changes if available */}
                  {activity.changes && activity.changes.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {activity.changes.slice(0, 3).map((change, i) => (
                        <div
                          key={i}
                          className="rounded-md bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800"
                        >
                          <span className="font-medium">{change.field}:</span>{' '}
                          <span className="text-red-600 line-through dark:text-red-400">
                            {String(change.oldValue)}
                          </span>
                          {' -> '}
                          <span className="text-green-600 dark:text-green-400">
                            {String(change.newValue)}
                          </span>
                        </div>
                      ))}
                      {activity.changes.length > 3 && (
                        <div className="text-xs text-zinc-500">
                          +{activity.changes.length - 3} more changes
                        </div>
                      )}
                    </div>
                  )}
                </TimelineItem>
              )
            })}
          </Timeline>
        </div>
      ))}
    </div>
  )
}
