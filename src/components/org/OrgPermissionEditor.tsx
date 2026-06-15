'use client'

import type { OrgPermission, OrgRoleDefinition } from '@/types/tenant'
import { Check, X } from 'lucide-react'
import { useState } from 'react'

interface OrgPermissionEditorProps {
  role: OrgRoleDefinition
  permissions: OrgPermission[]
  onSave: (permissions: string[]) => Promise<void>
  isLoading?: boolean
}

export function OrgPermissionEditor({
  role,
  permissions,
  onSave,
  isLoading,
}: OrgPermissionEditorProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(role.permissions)
  )
  const [hasChanges, setHasChanges] = useState(false)

  const groupedPermissions = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = []
      acc[perm.category]?.push(perm)
      return acc
    },
    {} as Record<string, OrgPermission[]>
  )

  const togglePermission = (permId: string) => {
    if (role.isSystem) return
    setSelectedPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(permId)) {
        next.delete(permId)
      } else {
        next.add(permId)
      }
      return next
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    await onSave(Array.from(selectedPermissions))
    setHasChanges(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">{role.name}</h3>
          <p className="text-sm text-zinc-400">{role.description}</p>
          {role.isSystem && (
            <span className="mt-1 inline-block rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
              System Role (Read-only)
            </span>
          )}
        </div>
        {hasChanges && !role.isSystem && (
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <div key={category} className="rounded-lg border border-zinc-700 bg-zinc-800/50">
            <div className="border-b border-zinc-700 px-4 py-3">
              <h4 className="text-sm font-medium text-zinc-300">{category}</h4>
            </div>
            <div className="divide-y divide-zinc-700/50">
              {perms.map((perm) => (
                <div key={perm.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm text-white">{perm.name}</div>
                    <div className="text-xs text-zinc-500">{perm.description}</div>
                  </div>
                  <button
                    onClick={() => togglePermission(perm.id)}
                    disabled={role.isSystem}
                    className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                      selectedPermissions.has(perm.id)
                        ? 'bg-emerald-500 text-white'
                        : 'border border-zinc-600 text-zinc-500 hover:border-zinc-500'
                    } ${role.isSystem ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {selectedPermissions.has(perm.id) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
