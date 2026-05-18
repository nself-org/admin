'use client'

import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * Chart component wrapping Recharts with built-in theming
 *
 * @example
 * ```tsx
 * const data = [
 *   { name: 'Jan', value: 400 },
 *   { name: 'Feb', value: 300 },
 *   { name: 'Mar', value: 600 },
 * ]
 *
 * <Chart type="line" data={data} dataKey="value" />
 * <Chart type="bar" data={data} dataKey="value" />
 * <Chart type="pie" data={data} dataKey="value" nameKey="name" />
 * ```
 */

export interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Chart type */
  type: 'line' | 'bar' | 'area' | 'pie' | 'donut'
  /** Chart data */
  data: Array<Record<string, unknown>>
  /** Data key for the value */
  dataKey: string
  /** Name key for labels (pie charts) */
  nameKey?: string
  /** Chart height */
  height?: number
  /** X-axis data key */
  xAxisKey?: string
  /** Chart color */
  color?: string
  /** Additional colors for multi-series */
  colors?: string[]
  /** Show grid */
  showGrid?: boolean
  /** Show legend */
  showLegend?: boolean
  /** Show tooltip */
  showTooltip?: boolean
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
]

export function Chart({
  type,
  data,
  dataKey,
  nameKey = 'name',
  height = 300,
  xAxisKey = 'name',
  color = '#3b82f6',
  colors = DEFAULT_COLORS,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  className,
  ...props
}: ChartProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const axisColor = isDark ? '#71717a' : '#a1a1aa'
  const gridColor = isDark ? '#27272a' : '#f4f4f5'
  const tooltipBg = isDark ? '#18181b' : '#ffffff'
  const tooltipBorder = isDark ? '#3f3f46' : '#e4e4e7'

  const commonProps = {
    data,
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
  }

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
            <XAxis dataKey={xAxisKey} stroke={axisColor} />
            <YAxis stroke={axisColor} />
            {showTooltip && (
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '6px',
                }}
              />
            )}
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color }}
            />
          </LineChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
            <XAxis dataKey={xAxisKey} stroke={axisColor} />
            <YAxis stroke={axisColor} />
            {showTooltip && (
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '6px',
                }}
              />
            )}
            {showLegend && <Legend />}
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        )

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
            <XAxis dataKey={xAxisKey} stroke={axisColor} />
            <YAxis stroke={axisColor} />
            {showTooltip && (
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '6px',
                }}
              />
            )}
            {showLegend && <Legend />}
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.3} />
          </AreaChart>
        )

      case 'pie':
      case 'donut':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius={type === 'donut' ? 60 : 0}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            {showTooltip && (
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '6px',
                }}
              />
            )}
            {showLegend && <Legend />}
          </PieChart>
        )
    }
  }

  return (
    <div className={cn('w-full', className)} {...props}>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}
