'use client'

import { OrgInviteModal, OrgMemberRoleMatrix, RoleBadge } from '@/components/org'
import { DashboardSkeleton, TableSkeleton } from '@/components/skeletons'
import { useOrganization } from '@/hooks/useOrganization'
import type { OrgRole } from '@/types/tenant'
import { ArrowLeft, MoreHorizontal, Search, UserMinus, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'

export default function OrgMembersPage() {
  const params = useParams()
  const orgId = params.id as string
  const { org, members, isLoading, error, addMember, removeMember, updateMemberRole } =
    useOrganization(orgId)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list')

  if (isLoading) return <DashboardSkeleton />

  if (error || !org) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <p className="text-red-400">{error || 'Organization not found'}</p>
      </div>
    )
  }

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleInvite = async (email: string, role: OrgRole, _message?: string) => {
    await addMember(email, role)
  }

  const handleUpdateRole = async (userId: string, role: OrgRole) => {
    await updateMemberRole(userId, role)
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
        <h1 className="mt-4 text-2xl font-semibold text-white">Members</h1>
        <p className="text-sm text-zinc-400">
          Manage members of {org.name} ({members.length} total)
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-zinc-700 bg-zinc-800">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 text-sm ${viewMode === 'matrix' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
            >
              Matrix
            </button>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <UserPlus className="h-4 w-4" /> Invite Member
          </button>
        </div>
      </div>

      {viewMode === 'matrix' ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50">
          <OrgMemberRoleMatrix
            members={filteredMembers}
            onUpdateRole={handleUpdateRole}
            isLoading={isLoading}
          />
        </div>
      ) : isLoading ? (
        <TableSkeleton />
      ) : filteredMembers.length > 0 ? (
        <div className="space-y-2">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-white uppercase">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{member.name}</span>
                    <RoleBadge role={member.role} />
                  </div>
                  <p className="text-sm text-zinc-500">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {member.teams.length > 0 && (
                  <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                    {member.teams.length} team
                    {member.teams.length > 1 ? 's' : ''}
                  </span>
                )}
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {openMenu === member.id && (
                    <div className="absolute top-8 right-0 z-10 w-44 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
                      {member.role !== 'owner' && (
                        <button
                          onClick={() => {
                            removeMember(member.userId)
                            setOpenMenu(null)
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-zinc-700"
                        >
                          <UserMinus className="h-4 w-4" />
                          Remove Member
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <UserPlus className="mb-4 h-12 w-12 text-zinc-600" />
          <h3 className="mb-2 text-lg font-medium text-white">
            {searchQuery ? 'No members found' : 'No members yet'}
          </h3>
          <p className="mb-4 text-sm text-zinc-400">
            {searchQuery ? 'Try a different search' : 'Invite your first team member'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              <UserPlus className="h-4 w-4" /> Invite Member
            </button>
          )}
        </div>
      )}

      <OrgInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        isLoading={isLoading}
      />
    </div>
  )
}
