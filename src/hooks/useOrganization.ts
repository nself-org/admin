/**
 * React hook for organization management
 */
'use client'

import { orgApi } from '@/lib/org'
import type { CreateOrgInput, Organization, OrgMember } from '@/types/tenant'
import { useCallback, useState } from 'react'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch')
  return data.data
}

export function useOrganization(orgId?: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch single org if ID provided
  const {
    data: org,
    error: fetchError,
    mutate: mutateOrg,
  } = useSWR<Organization>(orgId ? `/api/org/${orgId}` : null, fetcher, {
    refreshInterval: 30000,
  })

  // Fetch org members
  const { data: membersData, mutate: mutateMembers } = useSWR<{
    members: OrgMember[]
  }>(orgId ? `/api/org/${orgId}/members` : null, fetcher, {
    refreshInterval: 30000,
  })

  const create = useCallback(async (input: CreateOrgInput) => {
    setIsLoading(true)
    setError(null)
    try {
      const newOrg = await orgApi.create(input)
      return newOrg
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create organization'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const update = useCallback(
    async (input: Partial<CreateOrgInput>) => {
      if (!orgId) throw new Error('No organization ID')
      setIsLoading(true)
      setError(null)
      try {
        const updated = await orgApi.update(orgId, input)
        mutateOrg(updated)
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update organization'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [orgId, mutateOrg]
  )

  const remove = useCallback(async () => {
    if (!orgId) throw new Error('No organization ID')
    setIsLoading(true)
    setError(null)
    try {
      await orgApi.delete(orgId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete organization'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  const addMember = useCallback(
    async (email: string, role: OrgMember['role']) => {
      if (!orgId) throw new Error('No organization ID')
      setIsLoading(true)
      setError(null)
      try {
        const member = await orgApi.members.add(orgId, email, role)
        mutateMembers()
        return member
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add member'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [orgId, mutateMembers]
  )

  const removeMember = useCallback(
    async (userId: string) => {
      if (!orgId) throw new Error('No organization ID')
      setIsLoading(true)
      setError(null)
      try {
        await orgApi.members.remove(orgId, userId)
        mutateMembers()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove member'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [orgId, mutateMembers]
  )

  const updateMemberRole = useCallback(
    async (userId: string, role: OrgMember['role']) => {
      if (!orgId) throw new Error('No organization ID')
      setIsLoading(true)
      setError(null)
      try {
        const updated = await orgApi.members.updateRole(orgId, userId, role)
        mutateMembers()
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update member role'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [orgId, mutateMembers]
  )

  const refresh = useCallback(() => {
    mutateOrg()
    mutateMembers()
  }, [mutateOrg, mutateMembers])

  return {
    org,
    members: membersData?.members || [],
    isLoading: isLoading || (!org && !fetchError && !!orgId),
    error: error || (fetchError?.message ?? null),
    create,
    update,
    remove,
    addMember,
    removeMember,
    updateMemberRole,
    refresh,
  }
}

export function useOrganizationList() {
  const { data, error, isLoading, mutate } = useSWR<{
    organizations: Organization[]
    total: number
  }>('/api/org', fetcher, { refreshInterval: 30000 })

  return {
    organizations: data?.organizations || [],
    total: data?.total || 0,
    isLoading,
    error: error?.message ?? null,
    refresh: mutate,
  }
}
