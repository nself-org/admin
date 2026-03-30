'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import * as React from 'react'

/**
 * Timeline component for displaying chronological events
 *
 * @example
 * ```tsx
 * <Timeline>
 *   <TimelineItem
 *     title="Project Started"
 *     description="Initial setup and configuration"
 *     timestamp="2 hours ago"
 *     icon={Rocket}
 *   />
 *   <TimelineItem
 *     title="First Deployment"
 *     description="Successfully deployed to production"
 *     timestamp="1 hour ago"
 *     icon={CheckCircle}
 *     variant="success"
 *   />
 * </Timeline>
 * ```
 */

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Timeline({ children, className, ...props }: TimelineProps) {
  return (
    <div className={cn('space-y-8', className)} {...props}>
      {children}
    </div>
  )
}

export interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Item title */
  title: string
  /** Item description */
  description?: string
  /** Timestamp or date */
  timestamp?: string
  /** Icon to display */
  icon?: LucideIcon
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'danger'
  /** Show connecting line (default: true) */
  showLine?: boolean
}

export function TimelineItem({
  title,
  description,
  timestamp,
  icon: Icon,
  variant = 'default',
  showLine = true,
  className,
  children,
  ...props
}: TimelineItemProps) {
  const variantColors = {
    default: 'bg-zinc-900 dark:bg-zinc-50',
    success: 'bg-green-600 dark:bg-green-400',
    warning: 'bg-yellow-600 dark:bg-yellow-400',
    danger: 'bg-red-600 dark:bg-red-400',
  }

  const variantBorders = {
    default: 'border-zinc-200 dark:border-zinc-800',
    success: 'border-green-200 dark:border-green-800',
    warning: 'border-yellow-200 dark:border-yellow-800',
    danger: 'border-red-200 dark:border-red-800',
  }

  return (
    <div className={cn('relative flex gap-4', className)} {...props}>
      {/* Icon/Dot */}
      <div className="relative flex flex-col items-center">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            variantColors[variant],
          )}
        >
          {Icon ? (
            <Icon className="h-5 w-5 text-white" />
          ) : (
            <div className="h-3 w-3 rounded-full bg-white" />
          )}
        </div>
        {showLine && (
          <div
            className={cn(
              'absolute top-10 h-full w-0.5',
              variantBorders[variant],
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h4>
          {timestamp && (
            <time className="text-xs text-zinc-500 dark:text-zinc-400">
              {timestamp}
            </time>
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        )}
        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  )
}
