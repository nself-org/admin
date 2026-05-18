/**
 * React hook for tenant member management
 */
'use client'

import { api } from '@/lib/api-client'
import type { InviteMemberInput, TenantMember, TenantRole } from '@/types/tenant'
import { useCallback, useState } from 'react'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch')
  return data.data
}

export function useTenantMembers(tenantId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    data,
    error: fetchError,
    mutate,
  } = useSWR<{ members: TenantMember[] }>(
    tenantId ? `/api/tenant/${tenantId}/members` : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  const invite = useCallback(
    async (input: InviteMemberInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.post(`/api/tenant/${tenantId}/members`, input)
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Failed to invite member')
        mutate()
        return result.data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to invite member'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [tenantId, mutate]
  )

  const remove = useCallback(
    async (userId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.delete(`/api/tenant/${tenantId}/members/${userId}`)
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Failed to remove member')
        mutate()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove member'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [tenantId, mutate]
  )

  const updateRole = useCallback(
    async (userId: string, role: TenantRole) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.put(`/api/tenant/${tenantId}/members/${userId}`, { role })
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Failed to update role')
        mutate()
        return result.data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update role'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [tenantId, mutate]
  )

  const resendInvite = useCallback(
    async (userId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.post(`/api/tenant/${tenantId}/members/${userId}/resend`)
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Failed to resend invite')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to resend invite'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [tenantId]
  )

  return {
    members: data?.members || [],
    isLoading: isLoading || (!data && !fetchError),
    error: error || (fetchError?.message ?? null),
    invite,
    remove,
    updateRole,
    resendInvite,
    refresh: mutate,
  }
}
