'use client'

import { cn } from '@/lib/utils'
import type { Widget } from '@/types/dashboard'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import useSWR from 'swr'

interface MetricWidgetProps {
  widget: Widget
  className?: string
}

interface MetricData {
  value: number | string
  previousValue?: number
  trend?: 'up' | 'down' | 'neutral'
  trendPercentage?: number
  unit?: string
  prefix?: string
}

// API fetcher with error handling
const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Failed to fetch')
  }
  const data = await res.json()
  if (data.success === false) {
    throw new Error(data.error || 'Operation failed')
  }
  // If response has success:true wrapper, unwrap it
  return data.success ? data.data : data
}

export function MetricWidget({ widget, className }: MetricWidgetProps) {
  const thresholds = widget.config.thresholds
  const dataSource = widget.config.dataSource

  // Validate data source configuration
  const hasValidDataSource = dataSource?.endpoint && dataSource.type === 'api'

  // Use SWR for data fetching with refresh interval support
  const { data, error, isLoading } = useSWR<MetricData>(
    hasValidDataSource ? dataSource.endpoint : null,
    fetcher,
    {
      refreshInterval: dataSource?.refreshInterval ? dataSource.refreshInterval * 1000 : 0,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  // Determine color based on thresholds
  const getThresholdColor = (value: number | string): string => {
    if (typeof value !== 'number') return ''
    if (thresholds?.critical && value >= thresholds.critical) {
      return 'text-red-600 dark:text-red-400'
    }
    if (thresholds?.warning && value >= thresholds.warning) {
      return 'text-yellow-600 dark:text-yellow-400'
    }
    return ''
  }

  // Format the value for display
  const formatValue = (value: number | string): string => {
    if (typeof value === 'string') return value

    // Format large numbers with abbreviations
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M'
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K'
    }
    return value.toLocaleString()
  }

  // Get trend icon and color
  const getTrendIndicator = (trend: 'up' | 'down' | 'neutral' | undefined) => {
    switch (trend) {
      case 'up':
        return {
          icon: TrendingUp,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
        }
      case 'down':
        return {
          icon: TrendingDown,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
        }
      default:
        return {
          icon: Minus,
          color: 'text-zinc-500 dark:text-zinc-400',
          bgColor: 'bg-zinc-100 dark:bg-zinc-800',
        }
    }
  }

  if (isLoading) {
    return (
      <div className={cn('flex h-full items-center justify-center p-6', className)}>
        <div className="text-center">
          <div className="mx-auto h-8 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mx-auto mt-2 h-4 w-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('flex h-full items-center justify-center p-6', className)}>
        <div className="text-center">
          <p className="text-sm text-red-500">
            {error instanceof Error ? error.message : 'Failed to load data'}
          </p>
          {!hasValidDataSource && (
            <p className="mt-1 text-xs text-zinc-400">Invalid data source configuration</p>
          )}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={cn('flex h-full items-center justify-center p-6', className)}>
        <div className="text-center">
          <p className="text-sm text-zinc-500">No data available</p>
        </div>
      </div>
    )
  }

  const trendIndicator = getTrendIndicator(data.trend)
  const TrendIcon = trendIndicator.icon

  return (
    <div className={cn('flex h-full flex-col justify-center p-6', className)}>
      {/* Main value */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          {data.prefix && <span className="text-2xl text-zinc-400">{data.prefix}</span>}
          <span
            className={cn(
              'text-4xl font-bold text-zinc-900 dark:text-zinc-100',
              getThresholdColor(data.value)
            )}
          >
            {formatValue(data.value)}
          </span>
          {data.unit && (
            <span className="text-lg text-zinc-500 dark:text-zinc-400">{data.unit}</span>
          )}
        </div>

        {/* Trend indicator */}
        {data.trend && data.trendPercentage !== undefined && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1',
                trendIndicator.bgColor
              )}
            >
              <TrendIcon className={cn('h-3.5 w-3.5', trendIndicator.color)} />
              <span className={cn('text-sm font-medium', trendIndicator.color)}>
                {data.trend === 'up' ? '+' : data.trend === 'down' ? '-' : ''}
                {Math.abs(data.trendPercentage).toFixed(1)}%
              </span>
            </div>
            <span className="text-xs text-zinc-400">vs previous period</span>
          </div>
        )}

        {/* Threshold indicators */}
        {thresholds && (
          <div className="mt-4 flex items-center justify-center gap-4 text-xs">
            {thresholds.warning && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-zinc-500">Warning: {thresholds.warning}</span>
              </div>
            )}
            {thresholds.critical && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-zinc-500">Critical: {thresholds.critical}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
