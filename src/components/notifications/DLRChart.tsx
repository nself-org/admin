'use client'

import { type DLRSummary } from '@/lib/api/notifications'
import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'

export interface DLRChartProps {
  data: DLRSummary[]
  isLoading?: boolean
}

/**
 * Simple bar chart for delivery receipt analytics.
 * Uses SVG directly — no third-party chart library dependency.
 */
export function DLRChart({ data, isLoading }: DLRChartProps) {
  const CHART_HEIGHT = 200
  const BAR_GAP = 6
  const LABEL_HEIGHT = 24

  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.sent), 1),
    [data],
  )

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
        No delivery data for this period
      </div>
    )
  }

  const barGroupWidth = Math.max(
    20,
    Math.floor((400 - BAR_GAP * (data.length - 1)) / data.length),
  )
  const barWidth = Math.floor((barGroupWidth - BAR_GAP) / 3)
  const totalWidth = data.length * barGroupWidth + (data.length - 1) * BAR_GAP

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalWidth} ${CHART_HEIGHT + LABEL_HEIGHT}`}
        role="img"
        aria-label="Delivery rate chart"
        className="w-full"
      >
        {data.map((day, i) => {
          const x = i * (barGroupWidth + BAR_GAP)
          const sentH = Math.round((day.sent / maxValue) * CHART_HEIGHT)
          const delivH = Math.round((day.delivered / maxValue) * CHART_HEIGHT)
          const failH = Math.round((day.failed / maxValue) * CHART_HEIGHT)

          return (
            <g key={day.date} transform={`translate(${x}, 0)`}>
              {/* sent */}
              <rect
                x={0}
                y={CHART_HEIGHT - sentH}
                width={barWidth}
                height={sentH}
                rx={2}
                className="fill-sky-400"
              />
              {/* delivered */}
              <rect
                x={barWidth + 2}
                y={CHART_HEIGHT - delivH}
                width={barWidth}
                height={delivH}
                rx={2}
                className="fill-green-400"
              />
              {/* failed */}
              <rect
                x={barWidth * 2 + 4}
                y={CHART_HEIGHT - failH}
                width={barWidth}
                height={failH}
                rx={2}
                className="fill-red-400"
              />
              {/* date label */}
              <text
                x={barGroupWidth / 2}
                y={CHART_HEIGHT + 16}
                textAnchor="middle"
                fontSize={8}
                className="fill-zinc-400"
              >
                {day.date.slice(5)} {/* MM-DD */}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-400" />
          Sent
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-400" />
          Delivered
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400" />
          Failed
        </span>
      </div>
    </div>
  )
}
