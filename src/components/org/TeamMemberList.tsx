'use client'

import type { OrgMember } from '@/types/tenant'
import { MoreHorizontal, UserMinus } from 'lucide-react'
import { useState } from 'react'
import { RoleBadge } from './RoleBadge'

interface TeamMemberListProps {
  members: OrgMember[]
  onRemove: (userId: string) => void
  isLoading?: boolean
}

export function TeamMemberList({ members, onRemove, isLoading }: TeamMemberListProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center">
        <p className="text-sm text-zinc-500">No members in this team</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-white uppercase">
              {member.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{member.name}</span>
                <RoleBadge role={member.role} size="sm" />
              </div>
              <p className="text-xs text-zinc-500">{member.email}</p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {openMenu === member.id && (
              <div className="absolute top-8 right-0 z-10 w-40 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
                <button
                  onClick={() => {
                    onRemove(member.userId)
                    setOpenMenu(null)
                  }}
                  disabled={isLoading}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-zinc-700 disabled:opacity-50"
                >
                  <UserMinus className="h-4 w-4" />
                  Remove from Team
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
