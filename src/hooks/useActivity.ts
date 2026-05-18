/**
 * React hooks for activity feed management
 */
'use client'

import type {
  Activity,
  ActivityFeedOptions,
  ActivityResourceType,
  ActivityStats,
} from '@/types/activity'
import useSWR from 'swr'

const BASE_URL = '/api/activity'

/**
 * Fetcher with error handling
 */
const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch')
  return data.data
}

/**
 * Build query string from options
 */
function buildQueryString(options?: ActivityFeedOptions): string {
  if (!options) return ''

  const params = new URLSearchParams()

  if (options.limit !== undefined) {
    params.set('limit', String(options.limit))
  }
  if (options.offset !== undefined) {
    params.set('offset', String(options.offset))
  }
  if (options.cursor) {
    params.set('cursor', options.cursor)
  }
  if (options.includeChanges) {
    params.set('includeChanges', 'true')
  }

  // Filter options
  if (options.filter) {
    const { filter } = options

    if (filter.actorId) {
      params.set('actorId', filter.actorId)
    }
    if (filter.actorType) {
      params.set('actorType', filter.actorType)
    }
    if (filter.action) {
      const actions = Array.isArray(filter.action) ? filter.action.join(',') : filter.action
      params.set('action', actions)
    }
    if (filter.resourceType) {
      const types = Array.isArray(filter.resourceType)
        ? filter.resourceType.join(',')
        : filter.resourceType
      params.set('resourceType', types)
    }
    if (filter.resourceId) {
      params.set('resourceId', filter.resourceId)
    }
    if (filter.tenantId) {
      params.set('tenantId', filter.tenantId)
    }
    if (filter.startDate) {
      params.set('startDate', filter.startDate)
    }
    if (filter.endDate) {
      params.set('endDate', filter.endDate)
    }
    if (filter.search) {
      params.set('search', filter.search)
    }
  }

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}

/**
 * Activity feed response type
 */
interface ActivityFeedResponse {
  activities: Activity[]
  total: number
  hasMore: boolean
  nextCursor?: string
}

/**
 * Main activity feed hook with filtering support
 */
export function useActivityFeed(options?: ActivityFeedOptions) {
  const queryString = buildQueryString(options)
  const url = `${BASE_URL}${queryString}`

  const { data, error, isLoading, mutate } = useSWR<ActivityFeedResponse>(
    ['activity-feed', options],
    () => fetcher<ActivityFeedResponse>(url),
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  )

  return {
    activities: data?.activities ?? [],
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    nextCursor: data?.nextCursor,
    isLoading,
    isError: !!error,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  }
}

/**
 * Activity stats hook
 */
export function useActivityStats(tenantId?: string) {
  const url = tenantId
    ? `${BASE_URL}/stats?tenantId=${encodeURIComponent(tenantId)}`
    : `${BASE_URL}/stats`

  const { data, error, isLoading, mutate } = useSWR<ActivityStats>(
    ['activity-stats', tenantId],
    () => fetcher<ActivityStats>(url),
    {
      refreshInterval: 60000, // Refresh every minute
    }
  )

  return {
    stats: data ?? null,
    totalToday: data?.totalToday ?? 0,
    totalWeek: data?.totalWeek ?? 0,
    totalMonth: data?.totalMonth ?? 0,
    byAction: data?.byAction ?? {},
    byResource: data?.byResource ?? {},
    topActors: data?.topActors ?? [],
    timeline: data?.timeline ?? [],
    isLoading,
    isError: !!error,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  }
}

/**
 * Activity for a specific resource hook
 */
export function useResourceActivity(
  type: ActivityResourceType,
  id: string,
  options?: Omit<ActivityFeedOptions, 'filter'> & {
    includeChanges?: boolean
  }
) {
  const feedOptions: ActivityFeedOptions = {
    ...options,
    filter: {
      resourceType: type,
      resourceId: id,
    },
  }

  const queryString = buildQueryString(feedOptions)
  const url = `${BASE_URL}${queryString}`

  const { data, error, isLoading, mutate } = useSWR<ActivityFeedResponse>(
    type && id ? ['resource-activity', type, id, options] : null,
    () => fetcher<ActivityFeedResponse>(url),
    {
      refreshInterval: 30000,
    }
  )

  return {
    activities: data?.activities ?? [],
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    nextCursor: data?.nextCursor,
    isLoading,
    isError: !!error,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  }
}

/**
 * Activity by a specific actor hook
 */
export function useActorActivity(
  actorId: string,
  options?: Omit<ActivityFeedOptions, 'filter'> & {
    includeChanges?: boolean
  }
) {
  const feedOptions: ActivityFeedOptions = {
    ...options,
    filter: {
      actorId,
    },
  }

  const queryString = buildQueryString(feedOptions)
  const url = `${BASE_URL}${queryString}`

  const { data, error, isLoading, mutate } = useSWR<ActivityFeedResponse>(
    actorId ? ['actor-activity', actorId, options] : null,
    () => fetcher<ActivityFeedResponse>(url),
    {
      refreshInterval: 30000,
    }
  )

  return {
    activities: data?.activities ?? [],
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    nextCursor: data?.nextCursor,
    isLoading,
    isError: !!error,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  }
}

/**
 * Search activity hook
 */
export function useSearchActivity(query: string, options?: Omit<ActivityFeedOptions, 'filter'>) {
  const feedOptions: ActivityFeedOptions = {
    ...options,
    filter: {
      search: query,
    },
  }

  const queryString = buildQueryString(feedOptions)
  const url = `${BASE_URL}${queryString}`

  // Only fetch if query is provided
  const shouldFetch = query && query.trim().length > 0

  const { data, error, isLoading, mutate } = useSWR<ActivityFeedResponse>(
    shouldFetch ? ['search-activity', query, options] : null,
    () => fetcher<ActivityFeedResponse>(url),
    {
      refreshInterval: 0, // Don't auto-refresh search results
      revalidateOnFocus: false,
    }
  )

  return {
    activities: data?.activities ?? [],
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    nextCursor: data?.nextCursor,
    isLoading: shouldFetch ? isLoading : false,
    isError: !!error,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  }
}
