/**
 * React hooks for API key management
 */
'use client'

import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client'
import type {
  ApiKey,
  ApiKeyLog,
  ApiKeyRateLimit,
  ApiKeyStats,
  ApiKeyUsage,
  ApiKeyUsageStats,
  CreateApiKeyInput,
  CreateApiKeyResult,
} from '@/types/api-key'
import { useCallback, useState } from 'react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'

// Fetcher for SWR that handles API response format
const fetcher = async (url: string) => {
  const response = await apiGet(url)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch')
  return data.data
}

// API mutation functions for useSWRMutation
async function createApiKeyFn(
  _url: string,
  { arg }: { arg: CreateApiKeyInput }
): Promise<CreateApiKeyResult> {
  const response = await apiPost('/api/api-keys', arg)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to create API key')
  return data.data
}

async function updateApiKeyFn(
  url: string,
  { arg }: { arg: Partial<CreateApiKeyInput> }
): Promise<ApiKey> {
  const response = await apiPatch(url, arg)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to update API key')
  return data.data
}

async function revokeApiKeyFn(url: string): Promise<void> {
  const response = await apiPost(`${url}/revoke`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to revoke API key')
}

async function deleteApiKeyFn(url: string): Promise<void> {
  const response = await apiDelete(url)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to delete API key')
}

// Query options interface for list endpoints
interface ListQueryOptions {
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
}

/**
 * Hook to list all API keys, optionally filtered by tenant
 */
export function useApiKeys(tenantId?: string) {
  const url = tenantId ? `/api/api-keys?tenantId=${tenantId}` : '/api/api-keys'

  const { data, error, isLoading, mutate } = useSWR<ApiKey[]>(url, fetcher, {
    refreshInterval: 30000,
  })

  return {
    apiKeys: data ?? [],
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    refresh: mutate,
  }
}

/**
 * Hook to get a single API key by ID
 */
export function useApiKey(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ApiKey>(
    id ? `/api/api-keys/${id}` : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  return {
    apiKey: data,
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    refresh: mutate,
  }
}

/**
 * Hook to get usage data for an API key
 */
export function useApiKeyUsage(keyId: string | undefined, options?: ListQueryOptions) {
  const params = new URLSearchParams()
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.offset) params.set('offset', String(options.offset))
  if (options?.startDate) params.set('startDate', options.startDate)
  if (options?.endDate) params.set('endDate', options.endDate)

  const queryString = params.toString()
  const url = keyId ? `/api/api-keys/${keyId}/usage${queryString ? `?${queryString}` : ''}` : null

  const { data, error, isLoading, mutate } = useSWR<{
    usage: ApiKeyUsage[]
    total: number
  }>(url, fetcher, { refreshInterval: 60000 })

  return {
    usage: data?.usage ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    refresh: mutate,
  }
}

/**
 * Hook to get aggregated usage stats for an API key
 */
export function useApiKeyUsageStats(keyId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ApiKeyUsageStats>(
    keyId ? `/api/api-keys/${keyId}/stats` : null,
    fetcher,
    { refreshInterval: 60000 }
  )

  return {
    stats: data,
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    refresh: mutate,
  }
}

/**
 * Hook to get current rate limit status for an API key
 */
export function useApiKeyRateLimit(keyId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ApiKeyRateLimit>(
    keyId ? `/api/api-keys/${keyId}/rate-limit` : null,
    fetcher,
    { refreshInterval: 5000 } // More frequent refresh for rate limit status
  )

  return {
    rateLimit: data,
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    refresh: mutate,
  }
}

/**
 * Hook to get audit logs for an API key
 */
export function useApiKeyLogs(keyId: string | undefined, options?: ListQueryOptions) {
  const params = new URLSearchParams()
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.offset) params.set('offset', String(options.offset))
  if (options?.startDate) params.set('startDate', options.startDate)
  if (options?.endDate) params.set('endDate', options.endDate)

  const queryString = params.toString()
  const url = keyId ? `/api/api-keys/${keyId}/logs${queryString ? `?${queryString}` : ''}` : null

  const { data, error, isLoading, mutate } = useSWR<{
    logs: ApiKeyLog[]
    total: number
  }>(url, fetcher, { refreshInterval: 30000 })

  return {
    logs: data?.logs ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    refresh: mutate,
  }
}

/**
 * Hook to get overall API key statistics
 */
export function useApiKeyStats() {
  const { data, error, isLoading, mutate } = useSWR<ApiKeyStats>('/api/api-keys/stats', fetcher, {
    refreshInterval: 60000,
  })

  return {
    stats: data,
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    refresh: mutate,
  }
}

/**
 * Hook to create a new API key
 * Returns the secret key only once on creation!
 */
export function useCreateApiKey() {
  const { trigger, isMutating, error, reset } = useSWRMutation('/api/api-keys', createApiKeyFn)

  return {
    createApiKey: trigger,
    isCreating: isMutating,
    error: error?.message ?? null,
    reset,
  }
}

/**
 * Hook to update an existing API key
 */
export function useUpdateApiKey(keyId: string | undefined) {
  const { trigger, isMutating, error, reset } = useSWRMutation(
    keyId ? `/api/api-keys/${keyId}` : null,
    updateApiKeyFn
  )

  return {
    updateApiKey: trigger,
    isUpdating: isMutating,
    error: error?.message ?? null,
    reset,
  }
}

/**
 * Hook to revoke an API key
 */
export function useRevokeApiKey(keyId: string | undefined) {
  const { trigger, isMutating, error, reset } = useSWRMutation(
    keyId ? `/api/api-keys/${keyId}` : null,
    revokeApiKeyFn
  )

  return {
    revokeApiKey: trigger,
    isRevoking: isMutating,
    error: error?.message ?? null,
    reset,
  }
}

/**
 * Hook to delete an API key
 */
export function useDeleteApiKey(keyId: string | undefined) {
  const { trigger, isMutating, error, reset } = useSWRMutation(
    keyId ? `/api/api-keys/${keyId}` : null,
    deleteApiKeyFn
  )

  return {
    deleteApiKey: trigger,
    isDeleting: isMutating,
    error: error?.message ?? null,
    reset,
  }
}

/**
 * Combined hook for managing a single API key with all operations
 */
export function useApiKeyManagement(keyId: string | undefined) {
  const [operationError, setOperationError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch key data
  const {
    data: apiKey,
    error: fetchError,
    mutate,
  } = useSWR<ApiKey>(keyId ? `/api/api-keys/${keyId}` : null, fetcher, {
    refreshInterval: 30000,
  })

  // Fetch usage stats
  const { data: usageStats } = useSWR<ApiKeyUsageStats>(
    keyId ? `/api/api-keys/${keyId}/stats` : null,
    fetcher,
    { refreshInterval: 60000 }
  )

  // Fetch rate limit
  const { data: rateLimit } = useSWR<ApiKeyRateLimit>(
    keyId ? `/api/api-keys/${keyId}/rate-limit` : null,
    fetcher,
    { refreshInterval: 5000 }
  )

  const update = useCallback(
    async (input: Partial<CreateApiKeyInput>) => {
      if (!keyId) throw new Error('No API key ID')
      setIsLoading(true)
      setOperationError(null)
      try {
        const response = await apiPatch(`/api/api-keys/${keyId}`, input)
        const data = await response.json()
        if (!data.success) throw new Error(data.error || 'Failed to update')
        mutate(data.data)
        return data.data as ApiKey
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update API key'
        setOperationError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [keyId, mutate]
  )

  const revoke = useCallback(async () => {
    if (!keyId) throw new Error('No API key ID')
    setIsLoading(true)
    setOperationError(null)
    try {
      const response = await apiPost(`/api/api-keys/${keyId}/revoke`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to revoke')
      mutate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke API key'
      setOperationError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [keyId, mutate])

  const remove = useCallback(async () => {
    if (!keyId) throw new Error('No API key ID')
    setIsLoading(true)
    setOperationError(null)
    try {
      const response = await apiDelete(`/api/api-keys/${keyId}`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to delete')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete API key'
      setOperationError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [keyId])

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  return {
    apiKey,
    usageStats,
    rateLimit,
    isLoading: isLoading || (!apiKey && !fetchError && !!keyId),
    error: operationError || (fetchError?.message ?? null),
    update,
    revoke,
    remove,
    refresh,
  }
}
