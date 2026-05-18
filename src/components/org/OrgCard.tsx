'use client'

import type { Organization } from '@/types/tenant'
import { Building, Calendar } from 'lucide-react'
import Link from 'next/link'

interface OrgCardProps {
  org: Organization
}

export function OrgCard({ org }: OrgCardProps) {
  return (
    <Link
      href={`/org/${org.id}`}
      className="group rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5 transition-all hover:border-emerald-500/50 hover:bg-zinc-800"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
            <Building className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-white">{org.name}</h3>
            <p className="text-xs text-zinc-500">{org.slug}</p>
          </div>
        </div>
      </div>

      {org.description && (
        <p className="mb-4 line-clamp-2 text-sm text-zinc-400">{org.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {new Date(org.createdAt).toLocaleDateString()}
        </span>
      </div>
    </Link>
  )
}
