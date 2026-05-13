'use client'

import clsx from 'clsx'

export type SentryStatus =
  | 'operational'
  | 'degraded'
  | 'partial_outage'
  | 'major_outage'
  | 'maintenance'

const STATUS_CONFIG: Record<
  SentryStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  operational: {
    label: 'Operational',
    dotClass: 'bg-green-400',
    badgeClass:
      'border-green-500/40 bg-green-500/10 text-green-400',
  },
  degraded: {
    label: 'Degraded',
    dotClass: 'bg-amber-400',
    badgeClass:
      'border-amber-500/40 bg-amber-500/10 text-amber-400',
  },
  partial_outage: {
    label: 'Partial Outage',
    dotClass: 'bg-orange-400',
    badgeClass:
      'border-orange-500/40 bg-orange-500/10 text-orange-400',
  },
  major_outage: {
    label: 'Major Outage',
    dotClass: 'bg-red-400',
    badgeClass: 'border-red-500/40 bg-red-500/10 text-red-400',
  },
  maintenance: {
    label: 'Maintenance',
    dotClass: 'bg-gray-400',
    badgeClass:
      'border-nself-border bg-nself-bg/40 text-nself-text-muted',
  },
}

interface StatusBadgeProps {
  status: SentryStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        config.badgeClass,
        className,
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  )
}
