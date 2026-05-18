'use client'

interface TenantStatusBadgeProps {
  status: 'active' | 'suspended' | 'pending'
}

const statusConfig = {
  active: { label: 'Active', className: 'bg-emerald-500/20 text-emerald-400' },
  suspended: { label: 'Suspended', className: 'bg-red-500/20 text-red-400' },
  pending: { label: 'Pending', className: 'bg-yellow-500/20 text-yellow-400' },
}

export function TenantStatusBadge({ status }: TenantStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
