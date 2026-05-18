/**
 * Organization permission utilities
 */

import type { OrgPermission, OrgRole, OrgRoleDefinition } from '@/types/tenant'
import { api } from '../api-client'

// Standard permissions
export const STANDARD_PERMISSIONS: OrgPermission[] = [
  {
    id: 'view:dashboard',
    name: 'View Dashboard',
    description: 'View the organization dashboard',
    category: 'General',
  },
  {
    id: 'view:members',
    name: 'View Members',
    description: 'View organization members',
    category: 'Members',
  },
  {
    id: 'manage:members',
    name: 'Manage Members',
    description: 'Add, remove, and update members',
    category: 'Members',
  },
  {
    id: 'view:teams',
    name: 'View Teams',
    description: 'View organization teams',
    category: 'Teams',
  },
  {
    id: 'manage:teams',
    name: 'Manage Teams',
    description: 'Create, update, and delete teams',
    category: 'Teams',
  },
  {
    id: 'view:settings',
    name: 'View Settings',
    description: 'View organization settings',
    category: 'Settings',
  },
  {
    id: 'manage:settings',
    name: 'Manage Settings',
    description: 'Update organization settings',
    category: 'Settings',
  },
  {
    id: 'view:billing',
    name: 'View Billing',
    description: 'View billing information',
    category: 'Billing',
  },
  {
    id: 'manage:billing',
    name: 'Manage Billing',
    description: 'Update billing information',
    category: 'Billing',
  },
  {
    id: 'view:audit',
    name: 'View Audit Log',
    description: 'View audit trail',
    category: 'Audit',
  },
  {
    id: 'manage:roles',
    name: 'Manage Roles',
    description: 'Create and manage custom roles',
    category: 'Roles',
  },
  {
    id: 'delete:org',
    name: 'Delete Organization',
    description: 'Delete the organization',
    category: 'Danger',
  },
]

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<OrgRole, string[]> = {
  owner: STANDARD_PERMISSIONS.map((p) => p.id), // All permissions
  admin: [
    'view:dashboard',
    'view:members',
    'manage:members',
    'view:teams',
    'manage:teams',
    'view:settings',
    'manage:settings',
    'view:billing',
    'view:audit',
  ],
  member: ['view:dashboard', 'view:members', 'view:teams', 'view:settings'],
  viewer: ['view:dashboard'],
}

export async function listRoles(orgId: string): Promise<OrgRoleDefinition[]> {
  const response = await api.get(`/api/org/${orgId}/roles`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to list roles')
  return data.data.roles
}

export async function createRole(
  orgId: string,
  role: Omit<OrgRoleDefinition, 'id' | 'isSystem'>
): Promise<OrgRoleDefinition> {
  const response = await api.post(`/api/org/${orgId}/roles`, role)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to create role')
  return data.data
}

export async function updateRole(
  orgId: string,
  roleId: string,
  role: Partial<OrgRoleDefinition>
): Promise<OrgRoleDefinition> {
  const response = await api.put(`/api/org/${orgId}/roles/${roleId}`, role)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to update role')
  return data.data
}

export async function deleteRole(orgId: string, roleId: string): Promise<void> {
  const response = await api.delete(`/api/org/${orgId}/roles/${roleId}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to delete role')
}

export async function getPermissions(orgId: string): Promise<{ permissions: OrgPermission[] }> {
  const response = await api.get(`/api/org/${orgId}/permissions`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to get permissions')
  return data.data
}

export async function updatePermissions(
  orgId: string,
  roleId: string,
  permissions: string[]
): Promise<void> {
  const response = await api.put(`/api/org/${orgId}/permissions`, {
    roleId,
    permissions,
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to update permissions')
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: OrgRole, permission: string): boolean {
  return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: OrgRole, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: OrgRole, permissions: string[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: OrgRole): string[] {
  return DEFAULT_ROLE_PERMISSIONS[role] || []
}

export const permissionsApi = {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  updatePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  STANDARD_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
}
