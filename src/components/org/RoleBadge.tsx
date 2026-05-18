'use client'

import type { OrgRole, TenantRole } from '@/types/tenant'
import { Crown, Eye, Shield, User } from 'lucide-react'

type Role = OrgRole | TenantRole

interface RoleBadgeProps {
  role: Role
  size?: 'sm' | 'md'
}

const roleConfig: Record<
  Role,
  {
    icon: React.ComponentType<{ className?: string }>
    className: string
    label: string
  }
> = {
  owner: {
    icon: Crown,
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    label: 'Owner',
  },
  admin: {
    icon: Shield,
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    label: 'Admin',
  },
  member: {
    icon: User,
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    label: 'Member',
  },
  viewer: {
    icon: Eye,
    className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    label: 'Viewer',
  },
}

export function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const config = roleConfig[role]
  const Icon = config.icon

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-3 py-1 text-sm gap-1.5'

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.className} ${sizeClasses}`}
    >
      <Icon className={iconSize} />
      {config.label}
    </span>
  )
}
