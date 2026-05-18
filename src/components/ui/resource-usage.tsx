import { cn } from '@/lib/utils'
import { Cpu, HardDrive, MemoryStick } from 'lucide-react'

/**
 * ResourceUsage - CPU/memory/disk bars with percentage
 *
 * @example
 * ```tsx
 * <ResourceUsage
 *   type="cpu"
 *   used={45}
 *   total={100}
 *   label="CPU Usage"
 * />
 *
 * <ResourceUsage
 *   type="memory"
 *   used={4.2}
 *   total={8}
 *   unit="GB"
 * />
 * ```
 */
export interface ResourceUsageProps {
  /** Resource type */
  type: 'cpu' | 'memory' | 'disk'
  /** Used amount */
  used: number
  /** Total amount */
  total: number
  /** Unit label (e.g., 'GB', '%', 'cores') */
  unit?: string
  /** Custom label (overrides default) */
  label?: string
  /** Show detailed stats */
  showDetails?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

const icons = {
  cpu: Cpu,
  memory: MemoryStick,
  disk: HardDrive,
}

const defaultLabels = {
  cpu: 'CPU',
  memory: 'Memory',
  disk: 'Disk',
}

const sizeClasses = {
  sm: {
    container: 'gap-1',
    icon: 'h-3 w-3',
    text: 'text-xs',
    bar: 'h-1',
  },
  md: {
    container: 'gap-2',
    icon: 'h-4 w-4',
    text: 'text-sm',
    bar: 'h-2',
  },
  lg: {
    container: 'gap-3',
    icon: 'h-5 w-5',
    text: 'text-base',
    bar: 'h-3',
  },
}

export function ResourceUsage({
  type,
  used,
  total,
  unit,
  label,
  showDetails = false,
  size = 'md',
  className,
}: ResourceUsageProps) {
  const Icon = icons[type]
  const percentage = total > 0 ? (used / total) * 100 : 0
  const displayLabel = label || defaultLabels[type]
  const sizes = sizeClasses[size]

  const getColorClasses = (percent: number) => {
    if (percent >= 90) {
      return 'bg-red-500 dark:bg-red-600'
    }
    if (percent >= 70) {
      return 'bg-yellow-500 dark:bg-yellow-600'
    }
    return 'bg-green-500 dark:bg-green-600'
  }

  const formatValue = (value: number) => {
    if (unit) {
      return `${value.toFixed(1)}${unit}`
    }
    if (type === 'cpu') {
      return `${value.toFixed(0)}%`
    }
    return value.toFixed(2)
  }

  return (
    <div className={cn('flex flex-col', sizes.container, className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={cn(sizes.icon, 'text-zinc-500 dark:text-zinc-400')} aria-hidden="true" />
          <span className={cn(sizes.text, 'font-medium text-zinc-700 dark:text-zinc-300')}>
            {displayLabel}
          </span>
        </div>
        <div className={cn(sizes.text, 'font-semibold text-zinc-900 dark:text-zinc-100')}>
          {percentage.toFixed(0)}%
        </div>
      </div>

      <div
        className={cn(
          sizes.bar,
          'w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700'
        )}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${displayLabel} usage: ${percentage.toFixed(0)}%`}
      >
        <div
          className={cn('h-full transition-all duration-300', getColorClasses(percentage))}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {showDetails && (
        <div className={cn(sizes.text, 'text-zinc-500 dark:text-zinc-400')}>
          {formatValue(used)} / {formatValue(total)}
        </div>
      )}
    </div>
  )
}
