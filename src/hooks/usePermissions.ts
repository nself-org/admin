/**
 * React hook for permission management
 */
'use client'

import { DEFAULT_ROLE_PERMISSIONS, permissionsApi, STANDARD_PERMISSIONS } from '@/lib/org'
import type { OrgRole, OrgRoleDefinition } from '@/types/tenant'
import { useCallback, useMemo, useState } from 'react'
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch')
  return data.data
}

export function usePermissions(orgId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    data: rolesData,
    error: fetchError,
    mutate,
  } = useSWR<{ roles: OrgRoleDefinition[] }>(orgId ? `/api/org/${orgId}/roles` : null, fetcher)

  const roles = useMemo(() => rolesData?.roles || [], [rolesData])

  const createRole = useCallback(
    async (role: Omit<OrgRoleDefinition, 'id' | 'isSystem'>) => {
      setIsLoading(true)
      setError(null)
      try {
        const newRole = await permissionsApi.createRole(orgId, role)
        mutate()
        return newRole
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create role'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [orgId, mutate]
  )

  const updateRole = useCallback(
    async (roleId: string, role: Partial<OrgRoleDefinition>) => {
      setIsLoading(true)
      setError(null)
      try {
        const updated = await permissionsApi.updateRole(orgId, roleId, role)
        mutate()
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update role'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [orgId, mutate]
  )

  const deleteRole = useCallback(
    async (roleId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        await permissionsApi.deleteRole(orgId, roleId)
        mutate()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete role'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [orgId, mutate]
  )

  const checkPermission = useCallback((role: OrgRole, permission: string) => {
    return permissionsApi.hasPermission(role, permission)
  }, [])

  const checkAnyPermission = useCallback((role: OrgRole, permissions: string[]) => {
    return permissionsApi.hasAnyPermission(role, permissions)
  }, [])

  const checkAllPermissions = useCallback((role: OrgRole, permissions: string[]) => {
    return permissionsApi.hasAllPermissions(role, permissions)
  }, [])

  const getRolePermissions = useCallback((role: OrgRole) => {
    return permissionsApi.getRolePermissions(role)
  }, [])

  return {
    roles,
    standardPermissions: STANDARD_PERMISSIONS,
    defaultRolePermissions: DEFAULT_ROLE_PERMISSIONS,
    isLoading: isLoading || (!rolesData && !fetchError),
    error: error || (fetchError?.message ?? null),
    createRole,
    updateRole,
    deleteRole,
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    getRolePermissions,
    refresh: mutate,
  }
}
