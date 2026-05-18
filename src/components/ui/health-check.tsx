'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Loader2, XCircle } from 'lucide-react'
import * as React from 'react'
import { Card } from './card'

/**
 * Health check component for service status
 *
 * @example
 * ```tsx
 * <HealthCheck
 *   service="PostgreSQL"
 *   status="healthy"
 *   message="All systems operational"
 *   lastChecked="2 minutes ago"
 * />
 * ```
 */

export interface HealthCheckProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Service name */
  service: string
  /** Health status */
  status: 'healthy' | 'unhealthy' | 'degraded' | 'checking'
  /** Status message */
  message?: string
  /** Last check timestamp */
  lastChecked?: string
  /** Response time */
  responseTime?: string
  /** Show details */
  showDetails?: boolean
}

export function HealthCheck({
  service,
  status,
  message,
  lastChecked,
  responseTime,
  showDetails = false,
  className,
  ...props
}: HealthCheckProps) {
  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-200 dark:border-green-800',
      label: 'Healthy',
    },
    unhealthy: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      borderColor: 'border-red-200 dark:border-red-800',
      label: 'Unhealthy',
    },
    degraded: {
      icon: AlertTriangle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      label: 'Degraded',
    },
    checking: {
      icon: Loader2,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800',
      label: 'Checking',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Card className={cn('border-l-4', config.borderColor, config.bgColor, className)} {...props}>
      <div className="flex items-start justify-between p-4">
        <div className="flex items-start gap-3">
          <Icon
            className={cn(
              'h-5 w-5 flex-shrink-0',
              config.color,
              status === 'checking' && 'animate-spin'
            )}
          />
          <div className="space-y-1">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">{service}</h4>
            {message && <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>}
            {showDetails && (lastChecked || responseTime) && (
              <div className="flex gap-4 text-xs text-zinc-500 dark:text-zinc-500">
                {lastChecked && <span>Last checked: {lastChecked}</span>}
                {responseTime && <span>Response: {responseTime}</span>}
              </div>
            )}
          </div>
        </div>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', config.color)}>
          {config.label}
        </span>
      </div>
    </Card>
  )
}
