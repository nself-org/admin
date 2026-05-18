'use client'

import type { Notification, NotificationPreferences, NotificationStats } from '@/types/notification'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'

// Default user ID for single-user nAdmin
const CURRENT_USER = 'admin'

// API fetcher with error handling
const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Failed to fetch')
  }
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.error || 'Operation failed')
  }
  return data
}

// Mutation fetcher for POST/PUT/DELETE requests
async function mutationFetcher<T>(
  url: string,
  { arg }: { arg?: Record<string, unknown> }
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: arg ? JSON.stringify(arg) : undefined,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Operation failed')
  }
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.error || 'Operation failed')
  }
  return data
}

// DELETE mutation fetcher
async function deleteFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Operation failed')
  }
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.error || 'Operation failed')
  }
  return data
}

// PUT mutation fetcher
async function putFetcher<T>(url: string, { arg }: { arg: Record<string, unknown> }): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Operation failed')
  }
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.error || 'Operation failed')
  }
  return data
}

interface NotificationsResponse {
  success: boolean
  notifications: Notification[]
  total: number
}

interface NotificationResponse {
  success: boolean
  notification: Notification
}

interface PreferencesResponse {
  success: boolean
  preferences: NotificationPreferences
}

interface StatsResponse {
  success: boolean
  stats: NotificationStats
}

interface UseNotificationsOptions {
  limit?: number
  unreadOnly?: boolean
  type?: string
  priority?: string
}

/**
 * Main hook for fetching notification list
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const params = new URLSearchParams()
  if (options.limit) params.set('limit', options.limit.toString())
  if (options.unreadOnly) params.set('unreadOnly', 'true')
  if (options.type) params.set('type', options.type)
  if (options.priority) params.set('priority', options.priority)

  const queryString = params.toString()
  const url = `/api/notifications${queryString ? `?${queryString}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(url, fetcher, {
    refreshInterval: 30000,
  })

  return {
    notifications: data?.notifications ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  }
}

/**
 * Hook for fetching a single notification by ID
 */
export function useNotification(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<NotificationResponse>(
    id ? `/api/notifications/${id}` : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  return {
    notification: data?.notification ?? null,
    isLoading,
    isError: !!error,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  }
}

/**
 * Hook for fetching notification preferences
 */
export function useNotificationPreferences() {
  const { data, error, isLoading, mutate } = useSWR<PreferencesResponse>(
    `/api/notifications/preferences`,
    fetcher,
    { refreshInterval: 60000 }
  )

  return {
    preferences: data?.preferences ?? null,
    isLoading,
    isError: !!error,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  }
}

/**
 * Hook for fetching notification statistics
 */
export function useNotificationStats() {
  const { data, error, isLoading, mutate } = useSWR<StatsResponse>(
    `/api/notifications/stats`,
    fetcher,
    { refreshInterval: 30000 }
  )

  return {
    stats: data?.stats ?? null,
    unreadCount: data?.stats?.unread ?? 0,
    isLoading,
    isError: !!error,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  }
}

/**
 * Hook for marking a single notification as read
 */
export function useMarkAsRead() {
  const { trigger, isMutating, error } = useSWRMutation<
    NotificationResponse,
    Error,
    string,
    { id: string }
  >('/api/notifications/mark-read', async (url, { arg }) => {
    return mutationFetcher<NotificationResponse>(url, {
      arg: { notificationId: arg.id },
    })
  })

  return {
    markAsRead: async (id: string) => {
      const result = await trigger({ id })
      return result?.notification
    },
    isLoading: isMutating,
    error: error instanceof Error ? error.message : null,
  }
}

/**
 * Hook for marking all notifications as read
 */
export function useMarkAllAsRead() {
  const { trigger, isMutating, error } = useSWRMutation<
    { success: boolean; count: number },
    Error,
    string
  >('/api/notifications/mark-all-read', async (url) => {
    return mutationFetcher(url, {})
  })

  return {
    markAllAsRead: async () => {
      const result = await trigger()
      return result?.count ?? 0
    },
    isLoading: isMutating,
    error: error instanceof Error ? error.message : null,
  }
}

/**
 * Hook for deleting a notification
 */
export function useDeleteNotification() {
  const { trigger, isMutating, error } = useSWRMutation<
    { success: boolean },
    Error,
    string,
    { id: string }
  >('/api/notifications/delete', async (_url, { arg }) => {
    return deleteFetcher<{ success: boolean }>(`/api/notifications/${arg.id}`)
  })

  return {
    deleteNotification: async (id: string) => {
      await trigger({ id })
    },
    isLoading: isMutating,
    error: error instanceof Error ? error.message : null,
  }
}

/**
 * Hook for updating notification preferences
 */
export function useUpdatePreferences() {
  const { trigger, isMutating, error } = useSWRMutation<
    PreferencesResponse,
    Error,
    string,
    Partial<NotificationPreferences>
  >('/api/notifications/preferences', async (url, { arg }) => {
    return putFetcher<PreferencesResponse>(url, { arg })
  })

  return {
    updatePreferences: async (preferences: Partial<NotificationPreferences>) => {
      const result = await trigger(preferences)
      return result?.preferences
    },
    isLoading: isMutating,
    error: error instanceof Error ? error.message : null,
  }
}

/**
 * Combined hook for common notification operations
 * Provides all notification data and mutations in one hook
 */
export function useNotificationsWithActions(options: UseNotificationsOptions = {}) {
  const notifications = useNotifications(options)
  const stats = useNotificationStats()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()
  const deleteNotification = useDeleteNotification()

  const refreshAll = () => {
    notifications.refresh()
    stats.refresh()
  }

  return {
    // Data
    notifications: notifications.notifications,
    total: notifications.total,
    unreadCount: stats.unreadCount,
    stats: stats.stats,

    // Loading states
    isLoading: notifications.isLoading || stats.isLoading,
    isError: notifications.isError || stats.isError,

    // Actions
    markAsRead: async (id: string) => {
      const result = await markAsRead.markAsRead(id)
      refreshAll()
      return result
    },
    markAllAsRead: async () => {
      const result = await markAllAsRead.markAllAsRead()
      refreshAll()
      return result
    },
    deleteNotification: async (id: string) => {
      await deleteNotification.deleteNotification(id)
      refreshAll()
    },

    // Mutation loading states
    isMarkingRead: markAsRead.isLoading,
    isMarkingAllRead: markAllAsRead.isLoading,
    isDeleting: deleteNotification.isLoading,

    // Refresh
    refresh: refreshAll,
  }
}

// Export CURRENT_USER for use in API routes if needed
export { CURRENT_USER }
