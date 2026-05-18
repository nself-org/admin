'use client'

import { Chart } from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import type { ChartType, Widget } from '@/types/dashboard'
import useSWR from 'swr'

interface ChartWidgetProps {
  widget: Widget
  className?: string
}

interface ChartData {
  data: Array<Record<string, unknown>>
  xAxisKey?: string
  dataKey: string
  colors?: string[]
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

// Map our chart types to the Chart component types
function mapChartType(type: ChartType | undefined): 'line' | 'bar' | 'area' | 'pie' | 'donut' {
  switch (type) {
    case 'line':
      return 'line'
    case 'bar':
      return 'bar'
    case 'area':
      return 'area'
    case 'pie':
      return 'pie'
    case 'donut':
      return 'donut'
    case 'scatter':
    case 'heatmap':
      // Fall back to line for unsupported types
      return 'line'
    default:
      return 'line'
  }
}

export function ChartWidget({ widget, className }: ChartWidgetProps) {
  const visualization = widget.config.visualization
  const chartType = visualization?.chartType || 'line'
  const dataSource = widget.config.dataSource

  // Validate data source configuration
  const hasValidDataSource = dataSource?.endpoint && dataSource.type === 'api'

  // Use SWR for data fetching with refresh interval support
  const {
    data: chartData,
    error,
    isLoading,
  } = useSWR<ChartData>(hasValidDataSource ? dataSource.endpoint : null, fetcher, {
    refreshInterval: dataSource?.refreshInterval ? dataSource.refreshInterval * 1000 : 0,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })

  if (isLoading) {
    return (
      <div className={cn('flex h-full items-center justify-center p-4', className)}>
        <div className="h-full w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('flex h-full items-center justify-center p-4', className)}>
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

  if (!chartData || !chartData.data || chartData.data.length === 0) {
    return (
      <div className={cn('flex h-full items-center justify-center p-4', className)}>
        <div className="text-center">
          <p className="text-sm text-zinc-500">No data available</p>
        </div>
      </div>
    )
  }

  // For scatter and heatmap, render a simple placeholder
  if (chartType === 'scatter' || chartType === 'heatmap') {
    return (
      <div className={cn('h-full p-4', className)}>
        <ScatterPlaceholder data={chartData.data} type={chartType} />
      </div>
    )
  }

  // Determine chart color
  const color = widget.config.color || visualization?.colors?.[0] || '#3b82f6'
  const colors = visualization?.colors

  return (
    <div className={cn('h-full p-4', className)}>
      <Chart
        type={mapChartType(chartType)}
        data={chartData.data}
        dataKey={chartData.dataKey}
        xAxisKey={chartData.xAxisKey}
        color={color}
        colors={colors}
        showGrid={visualization?.showGrid ?? true}
        showLegend={visualization?.showLegend ?? true}
        showTooltip
        height={250}
      />
    </div>
  )
}

// Simple scatter plot placeholder using SVG
function ScatterPlaceholder({
  data,
  type,
}: {
  data: Array<Record<string, unknown>>
  type: 'scatter' | 'heatmap'
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1">
        <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          <g stroke="currentColor" strokeWidth="0.2" className="text-zinc-200 dark:text-zinc-700">
            {[20, 40, 60, 80].map((pos) => (
              <g key={pos}>
                <line x1={pos} y1="0" x2={pos} y2="100" />
                <line x1="0" y1={pos} x2="100" y2={pos} />
              </g>
            ))}
          </g>

          {/* Data points */}
          {data.map((point, index) => {
            const x = Number(point.x) || 0
            const y = 100 - (Number(point.y) || 0) // Invert Y for SVG coords

            if (type === 'heatmap') {
              const intensity = (Number(point.y) || 0) / 100
              return (
                <rect
                  key={index}
                  x={x - 4}
                  y={y - 4}
                  width="8"
                  height="8"
                  fill={`rgba(59, 130, 246, ${intensity})`}
                  rx="1"
                />
              )
            }

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2.5"
                fill="#3b82f6"
                className="hover:r-4 transition-all"
              />
            )
          })}
        </svg>
      </div>
      <div className="mt-2 text-center text-xs text-zinc-400">
        {type === 'scatter' ? 'Scatter Plot' : 'Heat Map'} - {data.length} points
      </div>
    </div>
  )
}
