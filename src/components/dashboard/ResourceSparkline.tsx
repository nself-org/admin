'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'

export interface DataPoint {
  timestamp: number
  value: number
}

interface ResourceSparklineProps {
  data: DataPoint[]
  label: string
  color?: string
  unit?: string
  maxValue?: number
  currentValue?: number
}

export function ResourceSparkline({
  data,
  label,
  color = '#3b82f6', // blue-500
  unit = '%',
  maxValue = 100,
  currentValue,
}: ResourceSparklineProps) {
  const displayValue = currentValue ?? (data.length > 0 ? data[data.length - 1].value : 0)
  const percentageUsed = maxValue > 0 ? (displayValue / maxValue) * 100 : 0

  const getColorByUsage = (percentage: number) => {
    if (percentage >= 90) return '#ef4444' // red-500
    if (percentage >= 75) return '#f59e0b' // amber-500
    return color
  }

  const currentColor = getColorByUsage(percentageUsed)

  // Format timestamp to relative time
  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload
      return (
        <div className="rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {formatTime(dataPoint.timestamp)}
          </p>
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            {dataPoint.value.toFixed(1)}
            {unit}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="text-lg font-bold" style={{ color: currentColor }}>
          {displayValue.toFixed(1)}
          {unit}
        </span>
      </div>

      {/* Sparkline Chart */}
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={currentColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={currentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={currentColor}
              strokeWidth={2}
              fill={`url(#gradient-${label})`}
              isAnimationActive={true}
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Usage Bar */}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(percentageUsed, 100)}%`,
            backgroundColor: currentColor,
          }}
        />
      </div>
    </div>
  )
}
