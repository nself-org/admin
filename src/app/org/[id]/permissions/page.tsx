'use client'

import { DashboardSkeleton } from '@/components/skeletons'
import { useOrganization } from '@/hooks/useOrganization'
import { useOrgTeams } from '@/hooks/useOrgTeams'
import { usePermissions } from '@/hooks/usePermissions'
import type { OrgRole } from '@/types/tenant'
import { ArrowLeft, Check, Crown, Eye, Filter, Shield, User, X } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'

const roleIcons: Record<OrgRole, typeof Shield> = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
}

const roleColors: Record<OrgRole, string> = {
  owner: 'text-yellow-400',
  admin: 'text-blue-400',
  member: 'text-emerald-400',
  viewer: 'text-zinc-400',
}

export default function OrgPermissionsPage() {
  const params = useParams()
  const orgId = params.id as string
  const { org, isLoading: orgLoading, error: orgError } = useOrganization(orgId)
  const { teams, isLoading: teamsLoading } = useOrgTeams(orgId)
  const {
    standardPermissions,
    getRolePermissions,
    isLoading: permsLoading,
    error: permsError,
  } = usePermissions(orgId)

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'roles' | 'teams'>('roles')

  const isLoading = orgLoading || teamsLoading || permsLoading

  if (isLoading) return <DashboardSkeleton />

  if (orgError || permsError || !org) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <p className="text-red-400">{orgError || permsError || 'Organization not found'}</p>
      </div>
    )
  }

  const categories = [...new Set(standardPermissions.map((p) => p.category))]

  const filteredPermissions = categoryFilter
    ? standardPermissions.filter((p) => p.category === categoryFilter)
    : standardPermissions

  const groupedPermissions = filteredPermissions.reduce(
    (acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = []
      acc[perm.category]?.push(perm)
      return acc
    },
    {} as Record<string, typeof standardPermissions>
  )

  const roles: OrgRole[] = ['owner', 'admin', 'member', 'viewer']

  const hasPermission = (role: OrgRole, permId: string): boolean => {
    const rolePerms = getRolePermissions(role)
    return rolePerms.includes(permId) || rolePerms.includes('*')
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
        <h1 className="mt-4 text-2xl font-semibold text-white">Permissions Matrix</h1>
        <p className="text-sm text-zinc-400">View permissions across roles and teams</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex rounded-lg border border-zinc-700 bg-zinc-800">
          <button
            onClick={() => setViewMode('roles')}
            className={`px-4 py-2 text-sm ${viewMode === 'roles' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
          >
            By Role
          </button>
          <button
            onClick={() => setViewMode('teams')}
            className={`px-4 py-2 text-sm ${viewMode === 'teams' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
          >
            By Team
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select
            value={categoryFilter || ''}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Permissions Matrix */}
      {viewMode === 'roles' ? (
        <div className="overflow-x-auto">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="min-w-[200px] px-4 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase">
                    Permission
                  </th>
                  {roles.map((role) => {
                    const Icon = roleIcons[role]
                    return (
                      <th
                        key={role}
                        className="px-4 py-3 text-center text-xs font-medium tracking-wider text-zinc-400 uppercase"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Icon className={`h-4 w-4 ${roleColors[role]}`} />
                          <span>{role}</span>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <>
                    <tr key={`cat-${category}`} className="bg-zinc-900/50">
                      <td
                        colSpan={roles.length + 1}
                        className="px-4 py-2 text-sm font-medium text-zinc-300"
                      >
                        {category}
                      </td>
                    </tr>
                    {perms.map((perm) => (
                      <tr
                        key={perm.id}
                        className="border-t border-zinc-700/50 hover:bg-zinc-800/50"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm text-white">{perm.name}</p>
                            <p className="text-xs text-zinc-500">{perm.description}</p>
                          </div>
                        </td>
                        {roles.map((role) => (
                          <td key={role} className="px-4 py-3 text-center">
                            {hasPermission(role, perm.id) ? (
                              <Check className="mx-auto h-5 w-5 text-emerald-400" />
                            ) : (
                              <X className="mx-auto h-5 w-5 text-zinc-600" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="min-w-[200px] px-4 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase">
                    Permission
                  </th>
                  {teams.map((team) => (
                    <th
                      key={team.id}
                      className="px-4 py-3 text-center text-xs font-medium tracking-wider text-zinc-400 uppercase"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Shield className="h-4 w-4 text-emerald-400" />
                        <span>{team.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <>
                    <tr key={`cat-${category}`} className="bg-zinc-900/50">
                      <td
                        colSpan={teams.length + 1}
                        className="px-4 py-2 text-sm font-medium text-zinc-300"
                      >
                        {category}
                      </td>
                    </tr>
                    {perms.map((perm) => (
                      <tr
                        key={perm.id}
                        className="border-t border-zinc-700/50 hover:bg-zinc-800/50"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm text-white">{perm.name}</p>
                            <p className="text-xs text-zinc-500">{perm.description}</p>
                          </div>
                        </td>
                        {teams.map((team) => (
                          <td key={team.id} className="px-4 py-3 text-center">
                            {team.permissions.includes(perm.id) ||
                            team.permissions.includes('*') ? (
                              <Check className="mx-auto h-5 w-5 text-emerald-400" />
                            ) : (
                              <X className="mx-auto h-5 w-5 text-zinc-600" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <h3 className="mb-3 text-sm font-medium text-zinc-400">Legend</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-400" />
            <span className="text-sm text-zinc-300">Permission granted</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="h-5 w-5 text-zinc-600" />
            <span className="text-sm text-zinc-300">Permission denied</span>
          </div>
        </div>

        <div className="mt-4 border-t border-zinc-700 pt-4">
          <h4 className="mb-2 text-xs font-medium text-zinc-500 uppercase">Role Hierarchy</h4>
          <div className="flex flex-wrap gap-4">
            {roles.map((role) => {
              const Icon = roleIcons[role]
              return (
                <div key={role} className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${roleColors[role]}`} />
                  <span className="text-sm text-zinc-300 capitalize">{role}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex gap-4">
        <Link
          href={`/org/${orgId}/roles`}
          className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
        >
          <Shield className="h-4 w-4" /> Manage Roles
        </Link>
        <Link
          href={`/org/${orgId}/teams`}
          className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
        >
          <User className="h-4 w-4" /> Manage Teams
        </Link>
      </div>
    </div>
  )
}
