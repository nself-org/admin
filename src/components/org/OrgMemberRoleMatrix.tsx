'use client'

import type { OrgMember, OrgRole } from '@/types/tenant'
import { Crown, Eye, Shield, User } from 'lucide-react'

interface OrgMemberRoleMatrixProps {
  members: OrgMember[]
  onUpdateRole: (userId: string, role: OrgRole) => void
  isLoading?: boolean
}

const roleConfig: Record<
  OrgRole,
  {
    icon: React.ComponentType<{ className?: string }>
    color: string
    label: string
  }
> = {
  owner: { icon: Crown, color: 'text-yellow-400', label: 'Owner' },
  admin: { icon: Shield, color: 'text-blue-400', label: 'Admin' },
  member: { icon: User, color: 'text-emerald-400', label: 'Member' },
  viewer: { icon: Eye, color: 'text-zinc-400', label: 'Viewer' },
}

export function OrgMemberRoleMatrix({
  members,
  onUpdateRole,
  isLoading,
}: OrgMemberRoleMatrixProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-700">
            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase">
              Member
            </th>
            {Object.entries(roleConfig).map(([role, config]) => (
              <th
                key={role}
                className="px-4 py-3 text-center text-xs font-medium tracking-wider text-zinc-400 uppercase"
              >
                <div className="flex flex-col items-center gap-1">
                  <config.icon className={`h-4 w-4 ${config.color}`} />
                  <span>{config.label}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-700">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-zinc-800/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-sm text-white uppercase">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-white">{member.name}</div>
                    <div className="text-xs text-zinc-500">{member.email}</div>
                  </div>
                </div>
              </td>
              {(Object.keys(roleConfig) as OrgRole[]).map((role) => (
                <td key={role} className="px-4 py-3 text-center">
                  <button
                    onClick={() => onUpdateRole(member.userId, role)}
                    disabled={isLoading || member.role === 'owner'}
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                      member.role === role
                        ? 'bg-emerald-500 text-white'
                        : 'border border-zinc-600 hover:border-emerald-500'
                    } ${member.role === 'owner' ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {member.role === role && (
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
