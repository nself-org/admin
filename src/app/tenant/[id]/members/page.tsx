'use client'

import { OrgInviteModal } from '@/components/org'
import { FormSkeleton } from '@/components/skeletons'
import { TenantMemberTable } from '@/components/tenant'
import { useTenantMembers } from '@/hooks/useTenantMembers'
import type { TenantRole } from '@/types/tenant'
import { ArrowLeft, Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'

export default function TenantMembersPage() {
  const params = useParams()
  const tenantId = params.id as string
  const { members, isLoading, error, invite, remove, updateRole, resendInvite } =
    useTenantMembers(tenantId)
  const [showInviteModal, setShowInviteModal] = useState(false)

  if (isLoading) return <FormSkeleton />

  const handleInvite = async (email: string, role: TenantRole, message?: string) => {
    await invite({ email, role, message })
    setShowInviteModal(false)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/tenant/${tenantId}`}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Tenant
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-white">Members</h1>
          <p className="text-sm text-zinc-400">{members.length} members</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" /> Invite Member
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {members.length > 0 ? (
        <TenantMemberTable
          members={members}
          onRemove={remove}
          onUpdateRole={updateRole}
          onResendInvite={resendInvite}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <Users className="mb-4 h-12 w-12 text-zinc-600" />
          <h3 className="mb-2 text-lg font-medium text-white">No members yet</h3>
          <p className="mb-4 text-sm text-zinc-400">Invite your first team member</p>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" /> Invite Member
          </button>
        </div>
      )}

      <OrgInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite as (email: string, role: string, message?: string) => Promise<void>}
      />
    </div>
  )
}
