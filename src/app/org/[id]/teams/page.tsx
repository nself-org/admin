'use client'

import { DashboardSkeleton } from '@/components/skeletons'
import { useOrganization } from '@/hooks/useOrganization'
import { useOrgTeams } from '@/hooks/useOrgTeams'
import { ArrowLeft, MoreHorizontal, Plus, Search, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export default function OrgTeamsPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string
  const { org, members, isLoading: orgLoading, error: orgError } = useOrganization(orgId)
  const { teams, isLoading: teamsLoading, create, remove } = useOrgTeams(orgId)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  const isLoading = orgLoading || teamsLoading

  if (isLoading) return <DashboardSkeleton />

  if (orgError || !org) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <p className="text-red-400">{orgError || 'Organization not found'}</p>
      </div>
    )
  }

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getTeamMemberCount = (teamId: string) => {
    return members.filter((m) => m.teams.includes(teamId)).length
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    if (!newTeamName.trim()) {
      setCreateError('Team name is required')
      return
    }

    try {
      const team = await create({
        name: newTeamName,
        description: newTeamDescription,
      })
      setShowCreateModal(false)
      setNewTeamName('')
      setNewTeamDescription('')
      router.push(`/org/${orgId}/teams/${team.id}`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create team')
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (confirm('Are you sure you want to delete this team?')) {
      await remove(teamId)
      setOpenMenu(null)
    }
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
        <h1 className="mt-4 text-2xl font-semibold text-white">Teams</h1>
        <p className="text-sm text-zinc-400">Organize members into teams ({teams.length} total)</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" /> Create Team
        </button>
      </div>

      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              className="group relative rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5 transition-all hover:border-emerald-500/50"
            >
              <Link href={`/org/${orgId}/teams/${team.id}`} className="block">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                    <Users className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{team.name}</h3>
                    <p className="text-xs text-zinc-500">
                      {getTeamMemberCount(team.id)} member
                      {getTeamMemberCount(team.id) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {team.description && (
                  <p className="line-clamp-2 text-sm text-zinc-400">{team.description}</p>
                )}
              </Link>

              <div className="absolute top-3 right-3">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setOpenMenu(openMenu === team.id ? null : team.id)
                  }}
                  className="rounded p-1 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-700 hover:text-white"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {openMenu === team.id && (
                  <div className="absolute top-8 right-0 z-10 w-40 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        handleDeleteTeam(team.id)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-zinc-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Team
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <Users className="mb-4 h-12 w-12 text-zinc-600" />
          <h3 className="mb-2 text-lg font-medium text-white">
            {searchQuery ? 'No teams found' : 'No teams yet'}
          </h3>
          <p className="mb-4 text-sm text-zinc-400">
            {searchQuery ? 'Try a different search' : 'Create your first team'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" /> Create Team
            </button>
          )}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Create Team</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Team Name *</label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                    placeholder="Engineering"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">Description</label>
                  <textarea
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                    placeholder="A brief description of the team"
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
                  <Users className="h-4 w-4" />
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
