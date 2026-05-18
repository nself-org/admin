'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import * as React from 'react'
import { Button } from './button'

/**
 * Empty state component for no data scenarios
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Database}
 *   title="No databases found"
 *   description="Get started by creating your first database"
 *   action={{
 *     label: "Create Database",
 *     onClick: () => handleCreate()
 *   }}
 * />
 * ```
 */

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon to display */
  icon?: LucideIcon
  /** Title text */
  title: string
  /** Description text */
  description?: string
  /** Primary action button */
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  /** Secondary action button */
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800',
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="mb-4 rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
          <Icon className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            <Button variant={action.variant || 'default'} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
