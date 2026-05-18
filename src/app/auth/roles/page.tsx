'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { TableSkeleton } from '@/components/skeletons'
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface RoleItem {
  name: string
  description: string
  permissions: string[]
  userCount: number
}

const PERMISSION_CATEGORIES: Record<string, string[]> = {
  users: ['users:read', 'users:write', 'users:delete'],
  content: ['content:read', 'content:write', 'content:delete', 'content:publish'],
  settings: ['settings:read', 'settings:write'],
  billing: ['billing:read', 'billing:write', 'billing:manage'],
  admin: ['admin:full', 'admin:audit', 'admin:security'],
}

const PERMISSION_LABELS: Record<string, string> = {
  'users:read': 'View Users',
  'users:write': 'Edit Users',
  'users:delete': 'Delete Users',
  'content:read': 'View Content',
  'content:write': 'Edit Content',
  'content:delete': 'Delete Content',
  'content:publish': 'Publish Content',
  'settings:read': 'View Settings',
  'settings:write': 'Edit Settings',
  'billing:read': 'View Billing',
  'billing:write': 'Edit Billing',
  'billing:manage': 'Manage Billing',
  'admin:full': 'Full Admin Access',
  'admin:audit': 'View Audit Logs',
  'admin:security': 'Manage Security',
}

function parseRolesOutput(raw: string): RoleItem[] {
  const roles: RoleItem[] = []
  const lines = raw.split('\n').filter((l) => l.trim())

  for (const line of lines) {
    // Try to parse JSON lines
    try {
      const parsed = JSON.parse(line)
      if (parsed.name) {
        roles.push({
          name: parsed.name,
          description: parsed.description || '',
          permissions: parsed.permissions || [],
          userCount: parsed.userCount || parsed.user_count || 0,
        })
        continue
      }
    } catch {
      // Not JSON, try other patterns
    }

    // Parse tabular format: name | description | permissions | users
    const parts = line.split('|').map((p) => p.trim())
    if (parts.length >= 2 && parts[0] && !parts[0].startsWith('-')) {
      roles.push({
        name: parts[0],
        description: parts[1] || '',
        permissions: parts[2] ? parts[2].split(',').map((p) => p.trim()) : [],
        userCount: parts[3] ? parseInt(parts[3], 10) || 0 : 0,
      })
    }
  }

  return roles
}

function RolesContent() {
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Create role form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [creatingRole, setCreatingRole] = useState(false)

  // Assign role form
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [assignRole, setAssignRole] = useState('')
  const [assignUserId, setAssignUserId] = useState('')
  const [assigningRole, setAssigningRole] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deletingRole, setDeletingRole] = useState(false)

  // Expanded permission categories
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const cliCommand = useCallback(() => {
    if (showCreateForm && newRoleName) {
      const perms = selectedPermissions.join(',')
      return `nself auth roles create --name=${newRoleName}${perms ? ` --permissions=${perms}` : ''}${newRoleDescription ? ` --description="${newRoleDescription}"` : ''}`
    }
    if (showAssignForm && assignRole && assignUserId) {
      return `nself auth roles assign --role=${assignRole} --user=${assignUserId}`
    }
    if (deleteTarget) {
      return `nself auth roles remove ${deleteTarget}`
    }
    return 'nself auth roles list'
  }, [
    showCreateForm,
    newRoleName,
    selectedPermissions,
    newRoleDescription,
    showAssignForm,
    assignRole,
    assignUserId,
    deleteTarget,
  ])

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/roles')
      const json = await response.json()
      if (json.success) {
        const raw = json.data.output || ''
        setOutput(raw)
        setRoles(parseRolesOutput(raw))
      } else {
        setError(json.details || json.error || 'Failed to list roles')
        setOutput(json.details || '')
      }
    } catch (_err) {
      setError('Failed to connect to roles API')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      setError('Role name is required')
      return
    }
    if (selectedPermissions.length === 0) {
      setError('Select at least one permission')
      return
    }

    setCreatingRole(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/auth/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDescription.trim() || undefined,
          permissions: selectedPermissions,
        }),
      })
      const json = await response.json()
      if (json.success) {
        setOutput(json.data.output || '')
        setSuccess(`Role "${newRoleName}" created successfully.`)
        setNewRoleName('')
        setNewRoleDescription('')
        setSelectedPermissions([])
        setShowCreateForm(false)
        fetchRoles()
      } else {
        setError(json.details || json.error || 'Failed to create role')
        setOutput(json.details || '')
      }
    } catch (_err) {
      setError('Failed to connect to roles API')
    } finally {
      setCreatingRole(false)
    }
  }

  const handleAssignRole = async () => {
    if (!assignRole.trim() || !assignUserId.trim()) {
      setError('Both role and user ID are required')
      return
    }

    setAssigningRole(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/auth/roles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: assignRole.trim(),
          userId: assignUserId.trim(),
        }),
      })
      const json = await response.json()
      if (json.success) {
        setOutput(json.data.output || '')
        setSuccess(`Role "${assignRole}" assigned to user "${assignUserId}".`)
        setAssignRole('')
        setAssignUserId('')
        setShowAssignForm(false)
        fetchRoles()
      } else {
        setError(json.details || json.error || 'Failed to assign role')
        setOutput(json.details || '')
      }
    } catch (_err) {
      setError('Failed to connect to roles API')
    } finally {
      setAssigningRole(false)
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    setDeletingRole(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/auth/roles/${encodeURIComponent(roleId)}`, {
        method: 'DELETE',
      })
      const json = await response.json()
      if (json.success) {
        setOutput(json.data.output || '')
        setSuccess(`Role "${roleId}" has been removed.`)
        setDeleteTarget(null)
        fetchRoles()
      } else {
        setError(json.details || json.error || 'Failed to delete role')
        setOutput(json.details || '')
      }
    } catch (_err) {
      setError('Failed to connect to roles API')
    } finally {
      setDeletingRole(false)
    }
  }

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  const toggleCategoryPermissions = (category: string) => {
    const perms = PERMISSION_CATEGORIES[category]
    const allSelected = perms.every((p) => selectedPermissions.includes(p))
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !perms.includes(p)))
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...perms])])
    }
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-blue-400 dark:to-white">
                Role Management
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Manage user roles and permissions for your application
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={fetchRoles} variant="secondary" disabled={loading}>
                {loading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
              <Button onClick={() => setShowCreateForm(!showCreateForm)} variant="primary">
                <Plus className="mr-2 h-4 w-4" />
                New Role
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Create Role Form */}
            {showCreateForm && (
              <div className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm dark:border-blue-800/50 dark:bg-zinc-800">
                <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-white">
                  Create New Role
                </h3>

                <div className="mb-4 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Role Name
                    </label>
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="e.g., editor, moderator"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={newRoleDescription}
                      onChange={(e) => setNewRoleDescription(e.target.value)}
                      placeholder="Brief description of the role"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Permissions
                    </label>
                    <div className="space-y-2">
                      {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => {
                        const isExpanded = expandedCategories[category] !== false
                        const selectedCount = perms.filter((p) =>
                          selectedPermissions.includes(p)
                        ).length
                        const allSelected = selectedCount === perms.length

                        return (
                          <div
                            key={category}
                            className="rounded-lg border border-zinc-200 dark:border-zinc-700"
                          >
                            <div className="flex items-center justify-between px-3 py-2">
                              <button
                                onClick={() => toggleCategory(category)}
                                className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                                )}
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </button>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {selectedCount}/{perms.length}
                                </span>
                                <button
                                  onClick={() => toggleCategoryPermissions(category)}
                                  className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                                    allSelected
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600'
                                  }`}
                                >
                                  {allSelected ? 'Deselect All' : 'Select All'}
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="border-t border-zinc-100 px-3 py-2 dark:border-zinc-700">
                                <div className="grid gap-1.5 sm:grid-cols-2">
                                  {perms.map((perm) => (
                                    <label
                                      key={perm}
                                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedPermissions.includes(perm)}
                                        onChange={() => togglePermission(perm)}
                                        className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600"
                                      />
                                      <span className="text-zinc-700 dark:text-zinc-300">
                                        {PERMISSION_LABELS[perm] || perm}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleCreateRole} variant="primary" disabled={creatingRole}>
                    {creatingRole ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    {creatingRole ? 'Creating...' : 'Create Role'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCreateForm(false)
                      setError(null)
                    }}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Role List */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Roles</h3>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                    {roles.length}
                  </span>
                </div>
              </div>

              {loading && roles.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="mr-3 h-5 w-5 animate-spin text-blue-500" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading roles...</p>
                </div>
              ) : roles.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    No roles found
                  </p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    Create a new role to get started
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {roles.map((role) => (
                    <div key={role.name} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                              {role.name}
                            </h4>
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                              {role.permissions.length} permission
                              {role.permissions.length !== 1 ? 's' : ''}
                            </span>
                            {role.userCount > 0 && (
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                                {role.userCount} user
                                {role.userCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {role.description && (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              {role.description}
                            </p>
                          )}
                          {role.permissions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {role.permissions.slice(0, 5).map((perm) => (
                                <span
                                  key={perm}
                                  className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                                >
                                  {perm}
                                </span>
                              ))}
                              {role.permissions.length > 5 && (
                                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                                  +{role.permissions.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="ml-4 flex gap-2">
                          {deleteTarget === role.name ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDeleteRole(role.name)}
                                disabled={deletingRole}
                                className="inline-flex items-center rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                              >
                                {deletingRole ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : null}
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteTarget(null)}
                                className="rounded px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteTarget(role.name)}
                              className="rounded p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                              title="Delete role"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assign Role Section */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                    Assign Role to User
                  </h3>
                </div>
                {!showAssignForm && (
                  <Button onClick={() => setShowAssignForm(true)} variant="secondary">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign
                  </Button>
                )}
              </div>

              {showAssignForm && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Role
                      </label>
                      <input
                        type="text"
                        value={assignRole}
                        onChange={(e) => setAssignRole(e.target.value)}
                        placeholder="Role name"
                        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        User ID
                      </label>
                      <input
                        type="text"
                        value={assignUserId}
                        onChange={(e) => setAssignUserId(e.target.value)}
                        placeholder="User ID or email"
                        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleAssignRole} variant="primary" disabled={assigningRole}>
                      {assigningRole ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="mr-2 h-4 w-4" />
                      )}
                      {assigningRole ? 'Assigning...' : 'Assign Role'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAssignForm(false)
                        setError(null)
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* CLI Command Preview */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
                CLI Command
              </h3>
              <div className="rounded-lg bg-zinc-900 p-4">
                <code className="font-mono text-xs break-all text-green-400">$ {cliCommand()}</code>
              </div>
            </div>

            {/* Feedback Messages */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                <div className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                  <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
                </div>
              </div>
            )}

            {/* CLI Output */}
            {output && (
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    CLI Output
                  </h3>
                </div>
                <div className="max-h-64 overflow-y-auto p-4">
                  <pre className="font-mono text-xs whitespace-pre-wrap text-zinc-600 dark:text-zinc-300">
                    {output}
                  </pre>
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
                Permission Categories
              </h3>
              <div className="space-y-2">
                {Object.entries(PERMISSION_CATEGORIES).map(([cat, perms]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-600 capitalize dark:text-zinc-400">
                      {cat}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {perms.length} permissions
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function RolesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <RolesContent />
    </Suspense>
  )
}
