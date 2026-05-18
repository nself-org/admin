'use client'

import { OrgCard } from '@/components/org'
import { CardGridSkeleton } from '@/components/skeletons'
import { useOrganizationList } from '@/hooks/useOrganization'
import { Building, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'

function OrganizationsContent() {
  const { organizations, total, isLoading, error } = useOrganizationList()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <p className="text-red-400">Failed to load organizations: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Organizations</h1>
          <p className="text-sm text-zinc-400">Manage your organizations ({total} total)</p>
        </div>
        <Link
          href="/org/create"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" /> Create Organization
        </Link>
      </div>

      {organizations.length > 0 && (
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      )}

      {isLoading ? (
        <CardGridSkeleton />
      ) : filteredOrgs.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrgs.map((org) => (
            <OrgCard key={org.id} org={org} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <Building className="mb-4 h-12 w-12 text-zinc-600" />
          <h3 className="mb-2 text-lg font-medium text-white">
            {searchQuery ? 'No organizations found' : 'No organizations yet'}
          </h3>
          <p className="mb-4 text-sm text-zinc-400">
            {searchQuery ? 'Try a different search' : 'Create your first organization'}
          </p>
          {!searchQuery && (
            <Link
              href="/org/create"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" /> Create Organization
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export default function OrganizationsPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <OrganizationsContent />
    </Suspense>
  )
}
