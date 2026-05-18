'use client'

import { Button } from '@/components/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
  XCircle,
} from 'lucide-react'

export interface ServiceStatus {
  running: boolean
  health: 'healthy' | 'unhealthy' | 'starting' | 'stopped'
  uptime?: string
  cpu?: number
  memory?: number
  memoryLimit?: number
  network?: {
    rx: string
    tx: string
  }
}

interface ServiceStatusCardProps {
  serviceName: string
  status: ServiceStatus
  onStart?: () => void
  onStop?: () => void
  onRestart?: () => void
  onRefresh?: () => void
  loading?: boolean
}

export function ServiceStatusCard({
  serviceName,
  status,
  onStart,
  onStop,
  onRestart,
  onRefresh,
  loading = false,
}: ServiceStatusCardProps) {
  const getHealthIcon = () => {
    switch (status.health) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'starting':
        return <Activity className="h-5 w-5 animate-pulse text-yellow-500" />
      case 'stopped':
        return <AlertCircle className="h-5 w-5 text-zinc-400" />
    }
  }

  const getHealthBadge = () => {
    const baseClasses = 'rounded px-2 py-1 text-xs font-medium'
    switch (status.health) {
      case 'healthy':
        return (
          <span
            className={`${baseClasses} bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400`}
          >
            Healthy
          </span>
        )
      case 'unhealthy':
        return (
          <span
            className={`${baseClasses} bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400`}
          >
            Unhealthy
          </span>
        )
      case 'starting':
        return (
          <span
            className={`${baseClasses} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400`}
          >
            Starting
          </span>
        )
      case 'stopped':
        return (
          <span
            className={`${baseClasses} bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-400`}
          >
            Stopped
          </span>
        )
    }
  }

  const memoryPercent =
    status.memory && status.memoryLimit ? (status.memory / status.memoryLimit) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getHealthIcon()}
            {serviceName} Status
          </CardTitle>
          {getHealthBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Uptime */}
        {status.uptime && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Clock className="h-4 w-4" />
              <span>Uptime</span>
            </div>
            <span className="font-mono text-sm font-medium">{status.uptime}</span>
          </div>
        )}

        {/* CPU Usage */}
        {status.cpu !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Cpu className="h-4 w-4" />
                <span>CPU Usage</span>
              </div>
              <span className="font-medium">{status.cpu.toFixed(1)}%</span>
            </div>
            <Progress value={status.cpu} className="h-2" />
          </div>
        )}

        {/* Memory Usage */}
        {status.memory !== undefined && status.memoryLimit !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <HardDrive className="h-4 w-4" />
                <span>Memory Usage</span>
              </div>
              <span className="font-medium">
                {(status.memory / (1024 * 1024)).toFixed(0)} MB /{' '}
                {(status.memoryLimit / (1024 * 1024)).toFixed(0)} MB
              </span>
            </div>
            <Progress value={memoryPercent} className="h-2" />
          </div>
        )}

        {/* Network I/O */}
        {status.network && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Network I/O</span>
            <span className="font-mono text-xs">
              <span className="text-green-600 dark:text-green-400">↓ {status.network.rx}</span>
              {' / '}
              <span className="text-blue-600 dark:text-blue-400">↑ {status.network.tx}</span>
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          {!status.running && onStart && (
            <Button onClick={onStart} disabled={loading} className="flex-1">
              <Play className="mr-1 h-4 w-4" />
              Start
            </Button>
          )}
          {status.running && onStop && (
            <Button onClick={onStop} variant="outline" disabled={loading} className="flex-1">
              <Pause className="mr-1 h-4 w-4" />
              Stop
            </Button>
          )}
          {status.running && onRestart && (
            <Button onClick={onRestart} variant="outline" disabled={loading} className="flex-1">
              <RotateCw className="mr-1 h-4 w-4" />
              Restart
            </Button>
          )}
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" disabled={loading}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Refresh
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
