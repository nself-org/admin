'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import * as React from 'react'
import { Card } from './card'

/**
 * Stat card component for displaying metrics
 *
 * @example
 * ```tsx
 * <StatCard
 *   title="Total Users"
 *   value="1,234"
 *   change="+12%"
 *   changeType="positive"
 *   icon={Users}
 * />
 * ```
 */

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card title */
  title: string
  /** Main value to display */
  value: string | number
  /** Optional description */
  description?: string
  /** Change indicator (e.g., "+12%") */
  change?: string
  /** Change type for styling */
  changeType?: 'positive' | 'negative' | 'neutral'
  /** Icon to display */
  icon?: LucideIcon
  /** Icon color */
  iconColor?: string
  /** Loading state */
  isLoading?: boolean
}

export function StatCard({
  title,
  value,
  description,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor,
  isLoading = false,
  className,
  ...props
}: StatCardProps) {
  const changeColors = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-zinc-600 dark:text-zinc-400',
  }

  return (
    <Card className={cn('p-6', className)} {...props}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
          )}
          {description && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          )}
          {change && !isLoading && (
            <p className={cn('mt-2 text-sm font-medium', changeColors[changeType])}>{change}</p>
          )}
        </div>
        {Icon && (
          <div className={cn('rounded-lg p-3', iconColor || 'bg-zinc-100 dark:bg-zinc-800')}>
            <Icon
              className={cn(
                'h-6 w-6',
                iconColor ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'
              )}
            />
          </div>
        )}
      </div>
    </Card>
  )
}
