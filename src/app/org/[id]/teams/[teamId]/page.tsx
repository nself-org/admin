'use client'

import { TeamMemberList } from '@/components/org'
import { DashboardSkeleton } from '@/components/skeletons'
import { useOrganization } from '@/hooks/useOrganization'
import { useOrgTeam, useOrgTeams } from '@/hooks/useOrgTeams'
import { ArrowLeft, Edit2, Save, Settings, Trash2, UserPlus, Users, X } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function TeamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string
  const teamId = params.teamId as string

  const { org, members, isLoading: orgLoading, error: orgError } = useOrganization(orgId)
  const { team, isLoading: teamLoading, error: teamError } = useOrgTeam(orgId, teamId)
  const { update, remove, addMember, removeMember } = useOrgTeams(orgId)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (team) {
      setEditName(team.name)
      setEditDescription(team.description || '')
    }
  }, [team])

  const isLoading = orgLoading || teamLoading

  if (isLoading) return <DashboardSkeleton />

  if (orgError || teamError || !org || !team) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <p className="text-red-400">{orgError || teamError || 'Team not found'}</p>
      </div>
    )
  }

  const teamMembers = members.filter((m) => m.teams.includes(teamId))
  const availableMembers = members.filter((m) => !m.teams.includes(teamId))

  const handleSave = async () => {
    setSaveError(null)
    if (!editName.trim()) {
      setSaveError('Team name is required')
      return
    }

    try {
      await update(teamId, {
        name: editName,
        description: editDescription,
      })
      setIsEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update team')
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this team?')) {
      await remove(teamId)
      router.push(`/org/${orgId}/teams`)
    }
  }

  const handleAddMember = async () => {
    if (!selectedMemberId) return
    await addMember(teamId, selectedMemberId)
    setSelectedMemberId('')
    setShowAddMember(false)
  }

  const handleRemoveMember = async (userId: string) => {
    if (confirm('Remove this member from the team?')) {
      await removeMember(teamId, userId)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/org/${orgId}/teams`}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Teams
          </Link>

          {isEditing ? (
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xl font-semibold text-white focus:border-emerald-500 focus:outline-none"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-400 focus:border-emerald-500 focus:outline-none"
                placeholder="Team description..."
              />
              {saveError && <p className="text-sm text-red-400">{saveError}</p>}
            </div>
          ) : (
            <>
              <h1 className="mt-4 text-2xl font-semibold text-white">{team.name}</h1>
              <p className="text-sm text-zinc-400">{team.description || 'No description'}</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
              >
                <Save className="h-4 w-4" /> Save
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">{teamMembers.length}</p>
              <p className="text-xs text-zinc-500">Members</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
              <Settings className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">{team.permissions.length}</p>
              <p className="text-xs text-zinc-500">Permissions</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/20">
              <UserPlus className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">{availableMembers.length}</p>
              <p className="text-xs text-zinc-500">Available to Add</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members Section */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Team Members</h2>
          {availableMembers.length > 0 && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
            >
              <UserPlus className="h-4 w-4" /> Add Member
            </button>
          )}
        </div>

        {showAddMember && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-900 p-3">
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Select a member...</option>
              {availableMembers.map((member) => (
                <option key={member.id} value={member.userId}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
            <button
              onClick={handleAddMember}
              disabled={!selectedMemberId}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddMember(false)}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        )}

        <TeamMemberList members={teamMembers} onRemove={handleRemoveMember} />
      </div>

      {/* Permissions Section */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
        <h2 className="mb-4 text-lg font-medium text-white">Team Permissions</h2>
        {team.permissions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {team.permissions.map((perm) => (
              <span
                key={perm}
                className="rounded-full border border-zinc-600 bg-zinc-700 px-3 py-1 text-xs text-zinc-300"
              >
                {perm}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No specific permissions assigned to this team.</p>
        )}
        <Link
          href={`/org/${orgId}/permissions`}
          className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300"
        >
          <Settings className="h-4 w-4" /> Manage Permissions
        </Link>
      </div>
    </div>
  )
}
