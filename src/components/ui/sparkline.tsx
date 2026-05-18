'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'

/**
 * Sparkline component for mini inline charts
 *
 * @example
 * ```tsx
 * <Sparkline
 *   data={[10, 20, 15, 30, 25, 40]}
 *   color="#3b82f6"
 *   height={40}
 * />
 * ```
 */

export interface SparklineProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Data points (array of numbers) */
  data: number[]
  /** Line color */
  color?: string
  /** Chart height */
  height?: number
  /** Show trend indicator */
  showTrend?: boolean
  /** Variant for trend color */
  variant?: 'default' | 'success' | 'danger'
}

export function Sparkline({
  data,
  color,
  height = 40,
  showTrend = false,
  variant = 'default',
  className,
  ...props
}: SparklineProps) {
  // Convert array to recharts format
  const chartData = data.map((value, index) => ({ index, value }))

  // Calculate trend
  const trend = data.length >= 2 ? data[data.length - 1] - data[0] : 0
  const trendPercentage = data[0] !== 0 ? ((trend / data[0]) * 100).toFixed(1) : '0.0'

  // Determine color
  const variantColors = {
    default: color || '#3b82f6',
    success: '#10b981',
    danger: '#ef4444',
  }

  const lineColor = variant !== 'default' ? variantColors[variant] : variantColors.default

  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      {showTrend && (
        <span
          className={cn(
            'text-xs font-medium',
            trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}
        >
          {trend >= 0 ? '+' : ''}
          {trendPercentage}%
        </span>
      )}
    </div>
  )
}
