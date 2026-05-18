/**
 * React hook for tenant branding management
 */
'use client'

import { brandingApi } from '@/lib/tenant'
import type { TenantBranding } from '@/types/tenant'
import { useCallback, useState } from 'react'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch')
  return data.data
}

export function useTenantBranding(tenantId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    data: branding,
    error: fetchError,
    mutate,
  } = useSWR<TenantBranding>(tenantId ? `/api/tenant/${tenantId}/branding` : null, fetcher)

  const updateLogo = useCallback(
    async (file: File) => {
      setIsLoading(true)
      setError(null)
      try {
        const logoUrl = await brandingApi.updateLogo(tenantId, file)
        mutate()
        return logoUrl
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update logo'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [tenantId, mutate]
  )

  const updateColors = useCallback(
    async (
      colors: Partial<Pick<TenantBranding, 'primaryColor' | 'secondaryColor' | 'accentColor'>>
    ) => {
      setIsLoading(true)
      setError(null)
      try {
        const updated = await brandingApi.updateColors(tenantId, colors)
        mutate(updated)
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update colors'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [tenantId, mutate]
  )

  const preview = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await brandingApi.preview(tenantId)
      return result.previewUrl
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get preview'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  const reset = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const updated = await brandingApi.reset(tenantId)
      mutate(updated)
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset branding'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, mutate])

  return {
    branding,
    isLoading: isLoading || (!branding && !fetchError),
    error: error || (fetchError?.message ?? null),
    updateLogo,
    updateColors,
    preview,
    reset,
    refresh: mutate,
  }
}
