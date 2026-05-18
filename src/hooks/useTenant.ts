/**
 * React hook for tenant management
 */
'use client'

import { tenantApi } from '@/lib/tenant'
import type { CreateTenantInput, Tenant, UpdateTenantInput } from '@/types/tenant'
import { useCallback, useState } from 'react'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch')
  return data.data
}

export function useTenant(tenantId?: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch single tenant if ID provided
  const {
    data: tenant,
    error: fetchError,
    mutate: mutateTenant,
  } = useSWR<Tenant>(tenantId ? `/api/tenant/${tenantId}` : null, fetcher, {
    refreshInterval: 30000,
  })

  // Fetch tenant stats
  const { data: stats, mutate: mutateStats } = useSWR(
    tenantId ? `/api/tenant/${tenantId}/stats` : null,
    fetcher,
    { refreshInterval: 60000 }
  )

  const create = useCallback(async (input: CreateTenantInput) => {
    setIsLoading(true)
    setError(null)
    try {
      const newTenant = await tenantApi.create(input)
      return newTenant
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tenant'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const update = useCallback(
    async (input: UpdateTenantInput) => {
      if (!tenantId) throw new Error('No tenant ID')
      setIsLoading(true)
      setError(null)
      try {
        const updated = await tenantApi.update(tenantId, input)
        mutateTenant(updated)
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update tenant'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [tenantId, mutateTenant]
  )

  const remove = useCallback(async () => {
    if (!tenantId) throw new Error('No tenant ID')
    setIsLoading(true)
    setError(null)
    try {
      await tenantApi.delete(tenantId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete tenant'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  const suspend = useCallback(async () => {
    if (!tenantId) throw new Error('No tenant ID')
    setIsLoading(true)
    setError(null)
    try {
      await tenantApi.suspend(tenantId)
      mutateTenant()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to suspend tenant'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, mutateTenant])

  const activate = useCallback(async () => {
    if (!tenantId) throw new Error('No tenant ID')
    setIsLoading(true)
    setError(null)
    try {
      await tenantApi.activate(tenantId)
      mutateTenant()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate tenant'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, mutateTenant])

  const refresh = useCallback(() => {
    mutateTenant()
    mutateStats()
  }, [mutateTenant, mutateStats])

  return {
    tenant,
    stats,
    isLoading: isLoading || (!tenant && !fetchError && !!tenantId),
    error: error || (fetchError?.message ?? null),
    create,
    update,
    remove,
    suspend,
    activate,
    refresh,
  }
}

export function useTenantList() {
  const { data, error, isLoading, mutate } = useSWR<{
    tenants: Tenant[]
    total: number
  }>('/api/tenant', fetcher, { refreshInterval: 30000 })

  return {
    tenants: data?.tenants || [],
    total: data?.total || 0,
    isLoading,
    error: error?.message ?? null,
    refresh: mutate,
  }
}
