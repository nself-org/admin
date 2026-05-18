'use client'

import { OrgPermissionEditor, RoleBadge } from '@/components/org'
import { DashboardSkeleton } from '@/components/skeletons'
import { useOrganization } from '@/hooks/useOrganization'
import { usePermissions } from '@/hooks/usePermissions'
import type { OrgRole, OrgRoleDefinition } from '@/types/tenant'
import { ArrowLeft, Crown, Edit2, Eye, Plus, Shield, Trash2, User, X } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'

const roleIcons: Record<string, typeof Shield> = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
}

export default function OrgRolesPage() {
  const params = useParams()
  const orgId = params.id as string
  const { org, isLoading: orgLoading, error: orgError } = useOrganization(orgId)
  const {
    roles,
    standardPermissions,
    isLoading: rolesLoading,
    error: rolesError,
    createRole,
    updateRole,
    deleteRole,
  } = usePermissions(orgId)

  const [selectedRole, setSelectedRole] = useState<OrgRoleDefinition | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const isLoading = orgLoading || rolesLoading

  if (isLoading) return <DashboardSkeleton />

  if (orgError || rolesError || !org) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <p className="text-red-400">{orgError || rolesError || 'Organization not found'}</p>
      </div>
    )
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    if (!newRoleName.trim()) {
      setCreateError('Role name is required')
      return
    }

    try {
      const role = await createRole({
        name: newRoleName,
        description: newRoleDescription,
        permissions: [],
      })
      setShowCreateModal(false)
      setNewRoleName('')
      setNewRoleDescription('')
      setSelectedRole(role)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create role')
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (confirm('Are you sure you want to delete this role?')) {
      await deleteRole(roleId)
      if (selectedRole?.id === roleId) {
        setSelectedRole(null)
      }
    }
  }

  const handleSavePermissions = async (permissions: string[]) => {
    if (!selectedRole) return
    setIsSaving(true)
    try {
      await updateRole(selectedRole.id, { permissions })
      setSelectedRole({ ...selectedRole, permissions })
    } finally {
      setIsSaving(false)
    }
  }

  const getRoleIcon = (role: OrgRoleDefinition) => {
    const roleKey = role.name.toLowerCase() as OrgRole
    return roleIcons[roleKey] || Shield
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/org/${orgId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {org.name}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">Roles</h1>
        <p className="text-sm text-zinc-400">Manage roles and their permissions</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Roles List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white">Available Roles</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-2">
            {roles.map((role) => {
              const RoleIcon = getRoleIcon(role)
              const isSelected = selectedRole?.id === role.id

              return (
                <div
                  key={role.id}
                  className={`group flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                  }`}
                  onClick={() => setSelectedRole(role)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isSelected ? 'bg-emerald-500/20' : 'bg-zinc-700'
                      }`}
                    >
                      <RoleIcon
                        className={`h-4 w-4 ${isSelected ? 'text-emerald-400' : 'text-zinc-400'}`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{role.name}</p>
                      <p className="text-xs text-zinc-500">{role.permissions.length} permissions</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {role.isSystem && (
                      <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
                        System
                      </span>
                    )}
                    {!role.isSystem && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteRole(role.id)
                        }}
                        className="rounded p-1 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Default Role Previews */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium text-zinc-400">Role Hierarchy</h3>
            <div className="space-y-2">
              {(['owner', 'admin', 'member', 'viewer'] as const).map((role) => (
                <div
                  key={role}
                  className="flex items-center justify-between rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-2"
                >
                  <RoleBadge role={role} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Permission Editor */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
            {selectedRole ? (
              <OrgPermissionEditor
                role={selectedRole}
                permissions={standardPermissions}
                onSave={handleSavePermissions}
                isLoading={isSaving}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="mb-4 h-12 w-12 text-zinc-600" />
                <h3 className="mb-2 text-lg font-medium text-white">Select a Role</h3>
                <p className="text-sm text-zinc-400">
                  Choose a role from the list to view and edit its permissions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Create Custom Role</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Role Name *</label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g., Developer, Reviewer"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Description</label>
                  <textarea
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                    placeholder="Describe what this role is for..."
                  />
                </div>

                {createError && <p className="text-sm text-red-400">{createError}</p>}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
                >
                  <Edit2 className="h-4 w-4" />
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
