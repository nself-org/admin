'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Progress bar component for showing linear progress
 *
 * @example
 * ```tsx
 * <ProgressBar
 *   value={75}
 *   max={100}
 *   label="75%"
 *   variant="success"
 * />
 * ```
 */

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current value */
  value: number
  /** Maximum value */
  max?: number
  /** Label to display */
  label?: string
  /** Show percentage */
  showPercentage?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'danger'
  /** Show label on right side */
  showLabel?: boolean
  /** Animated progress */
  animated?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = false,
  size = 'md',
  variant = 'default',
  showLabel = false,
  animated = false,
  className,
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  const variantClasses = {
    default: 'bg-zinc-900 dark:bg-zinc-50',
    success: 'bg-green-600 dark:bg-green-400',
    warning: 'bg-yellow-600 dark:bg-yellow-400',
    danger: 'bg-red-600 dark:bg-red-400',
  }

  const displayLabel = label || (showPercentage ? `${Math.round(percentage)}%` : '')

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {(label || showPercentage || showLabel) && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {displayLabel}
          </span>
          {showLabel && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800',
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            variantClasses[variant],
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}
