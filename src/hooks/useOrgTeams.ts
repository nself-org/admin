/**
 * React hook for organization team management
 */
'use client'

import { orgApi } from '@/lib/org'
import type { CreateTeamInput, Team } from '@/types/tenant'
import { useCallback, useState } from 'react'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch')
  return data.data
}

export function useOrgTeams(orgId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    data,
    error: fetchError,
    mutate,
  } = useSWR<{ teams: Team[] }>(orgId ? `/api/org/${orgId}/teams` : null, fetcher, {
    refreshInterval: 30000,
  })

  const create = useCallback(
    async (input: CreateTeamInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const team = await orgApi.teams.create(orgId, input)
        mutate()
        return team
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create team'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [orgId, mutate]
  )

  const update = useCallback(
    async (teamId: string, input: Partial<CreateTeamInput>) => {
      setIsLoading(true)
      setError(null)
      try {
        const team = await orgApi.teams.update(orgId, teamId, input)
        mutate()
        return team
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update team'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [orgId, mutate]
  )

  const remove = useCallback(
    async (teamId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await orgApi.teams.delete(orgId, teamId)
        mutate()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete team'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [orgId, mutate]
  )

  const addMember = useCallback(
    async (teamId: string, userId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const team = await orgApi.teams.get(orgId, teamId)
        const members = [...team.members, userId]
        await orgApi.teams.update(orgId, teamId, { members })
        mutate()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add member to team'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [orgId, mutate]
  )

  const removeMember = useCallback(
    async (teamId: string, userId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const team = await orgApi.teams.get(orgId, teamId)
        const members = team.members.filter((id) => id !== userId)
        await orgApi.teams.update(orgId, teamId, { members })
        mutate()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove member from team'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [orgId, mutate]
  )

  return {
    teams: data?.teams || [],
    isLoading: isLoading || (!data && !fetchError),
    error: error || (fetchError?.message ?? null),
    create,
    update,
    remove,
    addMember,
    removeMember,
    refresh: mutate,
  }
}

export function useOrgTeam(orgId: string, teamId: string) {
  const {
    data: team,
    error,
    isLoading,
    mutate,
  } = useSWR<Team>(orgId && teamId ? `/api/org/${orgId}/teams/${teamId}` : null, fetcher)

  return {
    team,
    isLoading,
    error: error?.message ?? null,
    refresh: mutate,
  }
}
