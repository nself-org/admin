'use client'

import { OrgTeamTree, RoleBadge } from '@/components/org'
import { DashboardSkeleton } from '@/components/skeletons'
import { useOrganization } from '@/hooks/useOrganization'
import { useOrgTeams } from '@/hooks/useOrgTeams'
import { ArrowLeft, MoreHorizontal, Settings, Shield, Users } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export default function OrgDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string
  const { org, members, isLoading, error, remove } = useOrganization(orgId)
  const { teams } = useOrgTeams(orgId)
  const [showActions, setShowActions] = useState(false)

  if (isLoading) return <DashboardSkeleton />

  if (error || !org) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <p className="text-red-400">{error || 'Organization not found'}</p>
      </div>
    )
  }

  const quickLinks = [
    {
      href: `/org/${orgId}/members`,
      icon: Users,
      label: 'Members',
      count: members.length,
    },
    {
      href: `/org/${orgId}/teams`,
      icon: Users,
      label: 'Teams',
      count: teams.length,
    },
    { href: `/org/${orgId}/roles`, icon: Shield, label: 'Roles' },
    { href: `/org/${orgId}/settings`, icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/org"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Organizations
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-white">{org.name}</h1>
          <p className="text-sm text-zinc-400">{org.description || org.slug}</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {showActions && (
            <div className="absolute top-12 right-0 z-10 w-48 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
              <button
                onClick={async () => {
                  if (confirm('Delete this organization?')) {
                    await remove()
                    router.push('/org')
                  }
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-zinc-700"
              >
                Delete Organization
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 transition-colors hover:border-emerald-500/50"
          >
            <link.icon className="h-6 w-6 text-zinc-400" />
            <span className="text-sm text-white">{link.label}</span>
            {link.count !== undefined && (
              <span className="text-xs text-zinc-500">{link.count}</span>
            )}
          </Link>
        ))}
      </div>

      {/* Teams Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
          <OrgTeamTree
            teams={teams}
            members={members}
            onCreateTeam={() => router.push(`/org/${orgId}/teams`)}
            onEditTeam={(teamId) => router.push(`/org/${orgId}/teams/${teamId}`)}
            onDeleteTeam={() => {}}
            onSelectTeam={(teamId) => router.push(`/org/${orgId}/teams/${teamId}`)}
          />
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-medium text-white">Recent Members</h2>
          <div className="space-y-3">
            {members.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-sm uppercase">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm text-white">{member.name}</p>
                    <p className="text-xs text-zinc-500">{member.email}</p>
                  </div>
                </div>
                <RoleBadge role={member.role} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
