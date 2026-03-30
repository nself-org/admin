'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Circular progress ring component
 *
 * @example
 * ```tsx
 * <ProgressRing
 *   value={75}
 *   max={100}
 *   size={120}
 *   strokeWidth={8}
 *   showPercentage
 * />
 * ```
 */

export interface ProgressRingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current value */
  value: number
  /** Maximum value */
  max?: number
  /** Ring size in pixels */
  size?: number
  /** Stroke width */
  strokeWidth?: number
  /** Show percentage in center */
  showPercentage?: boolean
  /** Custom label in center */
  label?: string
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  showPercentage = false,
  label,
  variant = 'default',
  className,
  ...props
}: ProgressRingProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  const variantColors = {
    default: 'stroke-zinc-900 dark:stroke-zinc-50',
    success: 'stroke-green-600 dark:stroke-green-400',
    warning: 'stroke-yellow-600 dark:stroke-yellow-400',
    danger: 'stroke-red-600 dark:stroke-red-400',
  }

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg width={size} height={size} className="-rotate-90 transform">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-zinc-200 dark:stroke-zinc-800"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            'fill-none transition-all duration-300',
            variantColors[variant],
          )}
        />
      </svg>
      {/* Center label */}
      {(showPercentage || label) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {label || `${Math.round(percentage)}%`}
          </span>
        </div>
      )}
    </div>
  )
}
