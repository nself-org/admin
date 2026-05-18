'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Activity, Cpu, HardDrive, Network } from 'lucide-react'
import { useState } from 'react'

export interface MetricDataPoint {
  timestamp: string
  value: number
}

interface ServiceMetricsProps {
  serviceName: string
  cpuData?: MetricDataPoint[]
  memoryData?: MetricDataPoint[]
  networkData?: {
    rx: MetricDataPoint[]
    tx: MetricDataPoint[]
  }
  requestRate?: MetricDataPoint[]
  timeRange?: '1h' | '6h' | '24h' | '7d'
  onTimeRangeChange?: (range: '1h' | '6h' | '24h' | '7d') => void
}

export function ServiceMetrics({
  serviceName,
  cpuData = [],
  memoryData = [],
  networkData,
  requestRate,
  timeRange = '1h',
  onTimeRangeChange,
}: ServiceMetricsProps) {
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'network' | 'requests'>(
    'cpu'
  )

  const renderSimpleChart = (data: MetricDataPoint[], label: string) => {
    if (data.length === 0) {
      return (
        <div className="flex h-64 items-center justify-center text-zinc-500">No data available</div>
      )
    }

    const max = Math.max(...data.map((d) => d.value))
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = 100 - (point.value / max) * 100
      return `${x},${y}`
    })

    return (
      <div className="space-y-4">
        <div className="relative h-64 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <svg className="h-full w-full" viewBox="0 0 100 100">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100"
                y2={y}
                stroke="currentColor"
                strokeWidth="0.2"
                className="text-zinc-300 dark:text-zinc-700"
              />
            ))}

            {/* Area fill */}
            <path
              d={`M 0,100 L ${points.join(' L ')} L 100,100 Z`}
              fill="currentColor"
              className="text-blue-500/20"
            />

            {/* Line */}
            <polyline
              points={points.join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-blue-500"
            />
          </svg>

          {/* Y-axis labels */}
          <div className="absolute top-4 left-0 flex h-full flex-col justify-between text-xs text-zinc-500">
            <span>{max.toFixed(1)}</span>
            <span>{(max * 0.75).toFixed(1)}</span>
            <span>{(max * 0.5).toFixed(1)}</span>
            <span>{(max * 0.25).toFixed(1)}</span>
            <span>0</span>
          </div>
        </div>

        {/* Current value */}
        <div className="text-center">
          <div className="text-3xl font-bold">
            {data[data.length - 1]?.value.toFixed(1) || '0'}
            {selectedMetric === 'cpu' && '%'}
            {selectedMetric === 'memory' && ' MB'}
          </div>
          <div className="text-sm text-zinc-500">{label}</div>
        </div>
      </div>
    )
  }

  const renderNetworkChart = () => {
    if (!networkData || networkData.rx.length === 0) {
      return (
        <div className="flex h-64 items-center justify-center text-zinc-500">
          No network data available
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-zinc-200 bg-green-50/50 p-4 dark:border-zinc-700 dark:bg-green-900/10">
            <div className="text-xs text-zinc-500">Network RX</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {networkData.rx[networkData.rx.length - 1]?.value.toFixed(2) || '0'} MB/s
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-blue-50/50 p-4 dark:border-zinc-700 dark:bg-blue-900/10">
            <div className="text-xs text-zinc-500">Network TX</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {networkData.tx[networkData.tx.length - 1]?.value.toFixed(2) || '0'} MB/s
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getCurrentData = () => {
    switch (selectedMetric) {
      case 'cpu':
        return { data: cpuData, label: 'CPU Usage', icon: Cpu }
      case 'memory':
        return { data: memoryData, label: 'Memory Usage', icon: HardDrive }
      case 'network':
        return { data: [], label: 'Network I/O', icon: Network }
      case 'requests':
        return {
          data: requestRate || [],
          label: 'Request Rate',
          icon: Activity,
        }
    }
  }

  const { data, label, icon: Icon } = getCurrentData()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {serviceName} Metrics
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpu">CPU Usage</SelectItem>
                <SelectItem value="memory">Memory Usage</SelectItem>
                <SelectItem value="network">Network I/O</SelectItem>
                {requestRate && <SelectItem value="requests">Request Rate</SelectItem>}
              </SelectContent>
            </Select>
            {onTimeRangeChange && (
              <Select
                value={timeRange}
                onValueChange={(value) => onTimeRangeChange(value as '1h' | '6h' | '24h' | '7d')}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last 1h</SelectItem>
                  <SelectItem value="6h">Last 6h</SelectItem>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7d</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedMetric === 'network' ? renderNetworkChart() : renderSimpleChart(data, label)}
      </CardContent>
    </Card>
  )
}
