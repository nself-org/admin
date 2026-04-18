import { cn } from '@/lib/utils'

type BadgeStatus = 'healthy' | 'degraded' | 'unhealthy' | 'active' | 'inactive'

interface StatusBadgeProps {
  status: BadgeStatus
  label?: string
}

const dotColor: Record<BadgeStatus, string> = {
  healthy: 'bg-green-500',
  active: 'bg-green-500',
  degraded: 'bg-amber-400',
  unhealthy: 'bg-red-500',
  inactive: 'bg-zinc-500',
}

const pillColor: Record<BadgeStatus, string> = {
  healthy: 'bg-green-500/10 text-green-400 ring-green-500/20',
  active: 'bg-green-500/10 text-green-400 ring-green-500/20',
  degraded: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
  unhealthy: 'bg-red-500/10 text-red-400 ring-red-500/20',
  inactive: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20',
}

/**
 * StatusBadge — small pill badge with dot indicator for health/activity states.
 *
 * Supports: healthy | active (green), degraded (amber), unhealthy (red), inactive (gray).
 * Renders no output when neither status nor label is provided.
 */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  const text = label ?? status

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        pillColor[status],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotColor[status])} />
      {text}
    </span>
  )
}
