'use client'

import type { OrgMember, Team } from '@/types/tenant'
import { ChevronDown, ChevronRight, Plus, Settings, Trash2, Users } from 'lucide-react'
import { useState } from 'react'

interface OrgTeamTreeProps {
  teams: Team[]
  members: OrgMember[]
  onCreateTeam: () => void
  onEditTeam: (teamId: string) => void
  onDeleteTeam: (teamId: string) => void
  onSelectTeam: (teamId: string) => void
  selectedTeamId?: string
}

export function OrgTeamTree({
  teams,
  members,
  onCreateTeam,
  onEditTeam,
  onDeleteTeam,
  onSelectTeam,
  selectedTeamId,
}: OrgTeamTreeProps) {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())

  const toggleExpand = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) {
        next.delete(teamId)
      } else {
        next.add(teamId)
      }
      return next
    })
  }

  const getTeamMembers = (teamId: string) => {
    return members.filter((m) => m.teams.includes(teamId))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-sm font-medium text-zinc-400">Teams</h3>
        <button
          onClick={onCreateTeam}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-4 text-center">
          <Users className="mx-auto mb-2 h-6 w-6 text-zinc-600" />
          <p className="text-xs text-zinc-500">No teams yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {teams.map((team) => {
            const isExpanded = expandedTeams.has(team.id)
            const isSelected = selectedTeamId === team.id
            const teamMembers = getTeamMembers(team.id)

            return (
              <div key={team.id}>
                <div
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                  onClick={() => onSelectTeam(team.id)}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(team.id)
                      }}
                      className="p-0.5"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{team.name}</span>
                    <span className="text-xs text-zinc-500">({teamMembers.length})</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditTeam(team.id)
                      }}
                      className="rounded p-1 hover:bg-zinc-700"
                    >
                      <Settings className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteTeam(team.id)
                      }}
                      className="rounded p-1 hover:bg-zinc-700 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {isExpanded && teamMembers.length > 0 && (
                  <div className="mt-1 ml-8 space-y-1">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-zinc-400"
                      >
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-[10px] uppercase">
                          {member.name.charAt(0)}
                        </div>
                        <span>{member.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
