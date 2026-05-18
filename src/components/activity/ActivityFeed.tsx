'use client'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useActivityFeed } from '@/hooks/useActivity'
import { cn } from '@/lib/utils'
import type { ActivityResourceType, ActivityFilter as FilterType } from '@/types/activity'
import { Activity, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import * as React from 'react'
import { ActivityFilter } from './ActivityFilter'
import { ActivityItem } from './ActivityItem'

/**
 * Main activity feed list component
 *
 * @example
 * ```tsx
 * <ActivityFeed
 *   resourceType="service"
 *   resourceId="postgres"
 *   showFilter
 *   limit={20}
 * />
 * ```
 */

export interface ActivityFeedProps {
  /** Filter by resource type */
  resourceType?: ActivityResourceType
  /** Filter by resource ID */
  resourceId?: string
  /** Show filter controls */
  showFilter?: boolean
  /** Number of activities to load */
  limit?: number
  /** Compact display mode */
  compact?: boolean
  /** Show changes diff */
  includeChanges?: boolean
  /** Additional class name */
  className?: string
}

/** Loading skeleton */
function ActivitySkeleton() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  )
}

export function ActivityFeed({
  resourceType,
  resourceId,
  showFilter = true,
  limit = 20,
  compact = false,
  includeChanges = false,
  className,
}: ActivityFeedProps) {
  const [filter, setFilter] = React.useState<FilterType>({})
  const [offset, setOffset] = React.useState(0)

  // Merge external filters with component filter
  const mergedFilter: FilterType = React.useMemo(
    () => ({
      ...filter,
      resourceType: resourceType || filter.resourceType,
      resourceId: resourceId || filter.resourceId,
    }),
    [filter, resourceType, resourceId]
  )

  const { activities, total, hasMore, isLoading, isError, error, refresh } = useActivityFeed({
    filter: mergedFilter,
    limit,
    offset,
    includeChanges,
  })

  const loadMore = () => {
    setOffset((prev) => prev + limit)
  }

  const handleRefresh = () => {
    setOffset(0)
    refresh()
  }

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter)
    setOffset(0) // Reset pagination when filter changes
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter controls */}
      {showFilter && (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ActivityFilter value={filter} onChange={handleFilterChange} compact={compact} />
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      )}

      {/* Activity count */}
      {!isLoading && activities.length > 0 && (
        <div className="text-sm text-zinc-500 dark:text-zinc-400">
          Showing {activities.length} of {total} activities
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Failed to load activities</span>
          </div>
          {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
          <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
            Try again
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && activities.length === 0 && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <ActivitySkeleton key={i} />
          ))}
        </div>
      )}

      {/* Activity list */}
      {!isLoading && activities.length === 0 && !isError && (
        <EmptyState
          icon={Activity}
          title="No activities found"
          description={
            Object.keys(filter).length > 0
              ? 'Try adjusting your filters to see more results.'
              : 'Activity will appear here when changes are made.'
          }
          action={
            Object.keys(filter).length > 0
              ? {
                  label: 'Clear filters',
                  onClick: () => handleFilterChange({}),
                  variant: 'outline',
                }
              : undefined
          }
        />
      )}

      {activities.length > 0 && (
        <div className="space-y-2">
          {activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              compact={compact}
              showDetails={includeChanges}
            />
          ))}
        </div>
      )}

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={loadMore} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
