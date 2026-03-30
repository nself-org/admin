'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Status indicator component showing running/stopped/warning state
 *
 * @example
 * ```tsx
 * <StatusIndicator status="running" label="Active" />
 * <StatusIndicator status="stopped" label="Offline" />
 * <StatusIndicator status="warning" label="Degraded" />
 * ```
 */

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Status type */
  status: 'running' | 'stopped' | 'warning' | 'error' | 'idle'
  /** Label text */
  label?: string
  /** Show pulse animation */
  pulse?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

export function StatusIndicator({
  status,
  label,
  pulse = false,
  size = 'md',
  className,
  ...props
}: StatusIndicatorProps) {
  const statusColors = {
    running: 'bg-green-500',
    stopped: 'bg-zinc-400 dark:bg-zinc-600',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    idle: 'bg-blue-500',
  }

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="status"
      {...props}
    >
      <div className="relative">
        <div
          className={cn(
            'rounded-full',
            statusColors[status],
            sizeClasses[size],
          )}
        />
        {pulse && (
          <div
            className={cn(
              'absolute inset-0 animate-ping rounded-full',
              statusColors[status],
              'opacity-75',
            )}
          />
        )}
      </div>
      {label && (
        <span
          className={cn(
            'font-medium text-zinc-900 dark:text-zinc-50',
            textSizes[size],
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}
