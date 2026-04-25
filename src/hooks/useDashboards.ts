/**
 * React hooks for dashboard management
 *
 * Provides hooks for fetching and mutating dashboards, widgets, and templates
 * using SWR for data fetching and caching.
 */
'use client'

import type {
  Dashboard,
  DashboardStats,
  Widget,
  WidgetTemplate,
} from '@/types/dashboard'
import { useCallback, useState } from 'react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'

// =============================================================================
// Fetcher Functions (using API endpoints instead of direct lib imports)
// =============================================================================

const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch')
  return data.data
}

async function postFetcher<T>(
  url: string,
  { arg }: { arg: T },
): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Request failed')
  return data.data
}

async function _putFetcher<T>(
  url: string,
  { arg }: { arg: T },
): Promise<unknown> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Request failed')
  return data.data
}

async function deleteFetcher(url: string): Promise<void> {
  const response = await fetch(url, { method: 'DELETE' })
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Request failed')
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to fetch all dashboards, optionally filtered by tenant
 */
export function useDashboards(tenantId?: string) {
  const queryParams = new URLSearchParams()
  if (tenantId) queryParams.set('tenantId', tenantId)
  const queryString = queryParams.toString()
  const url = `/api/dashboards${queryString ? `?${queryString}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<Dashboard[]>(url, fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: false,
  })

  return {
    dashboards: data ?? [],
    isLoading,
    isError: !!error,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  }
}

/**
 * Hook to fetch a single dashboard by ID
 */
export function useDashboard(id: string) {
  const { data, error, isLoading, mutate } = useSWR<Dashboard>(
    id ? `/api/dashboards/${id}` : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
    },
  )

  return {
    dashboard: data ?? null,
    widgets: data?.widgets ?? [],
    isLoading,
    isError: !!error,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  }
}

/**
 * Hook to fetch widget templates, optionally filtered by category
 */
export function useWidgetTemplates(category?: string) {
  const queryParams = new URLSearchParams()
  if (category) queryParams.set('category', category)
  const queryString = queryParams.toString()
  const url = `/api/dashboards/templates${queryString ? `?${queryString}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<{
    templates: WidgetTemplate[]
    categories: string[]
  }>(url, fetcher, {
    refreshInterval: 0, // Templates don't change often
    revalidateOnFocus: false,
  })

  return {
    templates: data?.templates ?? [],
    categories: data?.categories ?? [],
    isLoading,
    isError: !!error,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  }
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR<DashboardStats>(
    '/api/dashboards/stats',
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    },
  )

  return {
    stats: data ?? null,
    isLoading,
    isError: !!error,
    error: error instanceof Error ? error.message : null,
    refresh: mutate,
  }
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook for creating a new dashboard
 */
export function useCreateDashboard() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { trigger, isMutating } = useSWRMutation(
    '/api/dashboards',
    postFetcher<Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>>,
  )

  const create = useCallback(
    async (input: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>) => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await trigger(input)
        return result as Dashboard
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create dashboard'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [trigger],
  )

  return {
    create,
    isLoading: isLoading || isMutating,
    error,
  }
}

/**
 * Hook for updating an existing dashboard
 */
export function useUpdateDashboard() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Dashboard, 'id' | 'createdAt' | 'createdBy'>>,
    ) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/dashboards/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
        const data = await response.json()
        if (!data.success) throw new Error(data.error || 'Failed to update')
        return data.data as Dashboard
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update dashboard'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return {
    update,
    isLoading,
    error,
  }
}

/**
 * Hook for deleting a dashboard
 */
export function useDeleteDashboard() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await deleteFetcher(`/api/dashboards/${id}`)
      return true
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete dashboard'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    remove,
    isLoading,
    error,
  }
}

/**
 * Hook for cloning a dashboard
 */
export function useCloneDashboard() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clone = useCallback(async (id: string, newName?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/dashboards/${id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to clone')
      return data.data as Dashboard
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to clone dashboard'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    clone,
    isLoading,
    error,
  }
}

// =============================================================================
// Widget Mutation Hooks
// =============================================================================

/**
 * Hook for adding a widget to a dashboard
 */
export function useAddWidget() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const add = useCallback(
    async (dashboardId: string, widget: Omit<Widget, 'id'>) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/dashboards/${dashboardId}/widgets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(widget),
        })
        const data = await response.json()
        if (!data.success) throw new Error(data.error || 'Failed to add widget')
        return data.data as Widget
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to add widget'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return {
    add,
    isLoading,
    error,
  }
}

/**
 * Hook for updating a widget in a dashboard
 */
export function useUpdateWidget() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(
    async (
      dashboardId: string,
      widgetId: string,
      updates: Partial<Omit<Widget, 'id'>>,
    ) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/dashboards/${dashboardId}/widgets/${widgetId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          },
        )
        const data = await response.json()
        if (!data.success)
          throw new Error(data.error || 'Failed to update widget')
        return data.data as Widget
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update widget'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return {
    update,
    isLoading,
    error,
  }
}

/**
 * Hook for removing a widget from a dashboard
 */
export function useRemoveWidget() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = useCallback(async (dashboardId: string, widgetId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await deleteFetcher(`/api/dashboards/${dashboardId}/widgets/${widgetId}`)
      return true
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to remove widget'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    remove,
    isLoading,
    error,
  }
}
