'use client'

import type { TenantMember, TenantRole } from '@/types/tenant'
import { Mail, MoreHorizontal, Shield, UserMinus } from 'lucide-react'
import { useState } from 'react'

interface TenantMemberTableProps {
  members: TenantMember[]
  onRemove: (userId: string) => void
  onUpdateRole: (userId: string, role: TenantRole) => void
  onResendInvite?: (userId: string) => void
  isLoading?: boolean
}

const roleColors: Record<TenantRole, string> = {
  owner: 'bg-sky-500/20 text-sky-400',
  admin: 'bg-blue-500/20 text-blue-400',
  member: 'bg-zinc-500/20 text-zinc-400',
  viewer: 'bg-zinc-600/20 text-zinc-500',
}

export function TenantMemberTable({
  members,
  onRemove,
  onUpdateRole,
  onResendInvite,
  isLoading,
}: TenantMemberTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-zinc-800/50"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700">
      <table className="w-full">
        <thead className="border-b border-zinc-700 bg-zinc-800/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase">
              Member
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase">
              Role
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase">
              Joined
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-zinc-400 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-700">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-zinc-800/50">
              <td className="px-4 py-3">
                <div>
                  <div className="font-medium text-white">{member.name}</div>
                  <div className="text-xs text-zinc-500">{member.email}</div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleColors[member.role]}`}
                >
                  {member.role}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs ${member.status === 'active' ? 'text-emerald-400' : member.status === 'pending' ? 'text-yellow-400' : 'text-red-400'}`}
                >
                  {member.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-zinc-500">
                  {member.joinedAt
                    ? new Date(member.joinedAt).toLocaleDateString()
                    : 'Pending'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="relative flex justify-end">
                  <button
                    onClick={() =>
                      setOpenMenu(openMenu === member.id ? null : member.id)
                    }
                    className="rounded p-1 hover:bg-zinc-700"
                    disabled={member.role === 'owner'}
                  >
                    <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                  </button>
                  {openMenu === member.id && member.role !== 'owner' && (
                    <div className="absolute top-8 right-0 z-10 w-48 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
                      {member.status === 'pending' && onResendInvite && (
                        <button
                          onClick={() => {
                            onResendInvite(member.userId)
                            setOpenMenu(null)
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                        >
                          <Mail className="h-4 w-4" /> Resend Invite
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onUpdateRole(
                            member.userId,
                            member.role === 'admin' ? 'member' : 'admin',
                          )
                          setOpenMenu(null)
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                      >
                        <Shield className="h-4 w-4" />{' '}
                        {member.role === 'admin'
                          ? 'Remove Admin'
                          : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => {
                          onRemove(member.userId)
                          setOpenMenu(null)
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-zinc-700"
                      >
                        <UserMinus className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
