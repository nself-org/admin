'use client'

interface DataPoint {
  timestamp: string
  up: boolean
}

interface UptimeSparklineProps {
  dataPoints: DataPoint[]
  width?: number
  height?: number
}

export function UptimeSparkline({ dataPoints, width = 360, height = 24 }: UptimeSparklineProps) {
  const last90 = dataPoints.slice(-90)
  if (last90.length === 0) {
    return (
      <div
        className="border-nself-border flex items-center rounded border px-2 py-1"
        style={{ width, height }}
      >
        <span className="text-nself-text-muted text-xs">No data</span>
      </div>
    )
  }

  const segW = Math.max(Math.floor(width / last90.length) - 1, 2)
  const gap = 1

  return (
    <svg width={width} height={height} aria-label="Uptime history sparkline" role="img">
      {last90.map((point, i) => {
        const x = i * (segW + gap)
        const fill = point.up ? '#4ade80' : '#f87171'
        const title = `${new Date(point.timestamp).toLocaleString()}: ${point.up ? 'Up' : 'Down'}`
        return (
          <rect key={i} x={x} y={0} width={segW} height={height} fill={fill} rx={2} opacity={0.85}>
            <title>{title}</title>
          </rect>
        )
      })}
    </svg>
  )
}
