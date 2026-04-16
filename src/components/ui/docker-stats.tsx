import { cn } from '@/lib/utils'
import { Cpu, HardDrive, MemoryStick, Network } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './card'

/**
 * DockerStats - Container stats display
 *
 * @example
 * ```tsx
 * <DockerStats
 *   stats={{
 *     cpu: { percentage: 45.2, cores: 2 },
 *     memory: { usage: 512000000, limit: 1024000000, percentage: 50 },
 *     network: { rx: 1024000, tx: 512000 },
 *     blockIO: { read: 2048000, write: 1024000 },
 *   }}
 * />
 * ```
 */
export interface DockerStatsProps {
  /** Container statistics */
  stats: {
    cpu?: {
      percentage: number
      cores?: number
    }
    memory?: {
      usage: number
      limit: number
      percentage: number
    }
    network?: {
      rx: number
      tx: number
    }
    blockIO?: {
      read: number
      write: number
    }
    disk?: {
      used: number
      total: number
      percentage: number
    }
  }
  /** Show as compact card grid */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

const getProgressColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-red-500'
  if (percentage >= 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

export function DockerStats({
  stats,
  compact = false,
  className,
}: DockerStatsProps) {
  if (compact) {
    return (
      <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
        {/* CPU */}
        {stats.cpu && (
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <div className="mb-2 flex items-center gap-2">
              <Cpu
                className="h-4 w-4 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                CPU
              </span>
            </div>
            <div className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {stats.cpu.percentage.toFixed(1)}%
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className={cn(
                  'h-full transition-all',
                  getProgressColor(stats.cpu.percentage),
                )}
                style={{ width: `${Math.min(stats.cpu.percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Memory */}
        {stats.memory && (
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <div className="mb-2 flex items-center gap-2">
              <MemoryStick
                className="h-4 w-4 text-sky-500 dark:text-sky-400"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Memory
              </span>
            </div>
            <div className="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {formatBytes(stats.memory.usage)}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className={cn(
                  'h-full transition-all',
                  getProgressColor(stats.memory.percentage),
                )}
                style={{ width: `${Math.min(stats.memory.percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Network */}
        {stats.network && (
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <div className="mb-2 flex items-center gap-2">
              <Network
                className="h-4 w-4 text-green-600 dark:text-green-400"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Network
              </span>
            </div>
            <div className="space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              <div>↓ {formatBytes(stats.network.rx)}</div>
              <div>↑ {formatBytes(stats.network.tx)}</div>
            </div>
          </div>
        )}

        {/* Disk I/O */}
        {stats.blockIO && (
          <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <div className="mb-2 flex items-center gap-2">
              <HardDrive
                className="h-4 w-4 text-orange-600 dark:text-orange-400"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Disk I/O
              </span>
            </div>
            <div className="space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
              <div>R: {formatBytes(stats.blockIO.read)}</div>
              <div>W: {formatBytes(stats.blockIO.write)}</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {/* CPU Card */}
      {stats.cpu && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu
              className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.cpu.percentage.toFixed(1)}%
            </div>
            {stats.cpu.cores && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {stats.cpu.cores} core{stats.cpu.cores > 1 ? 's' : ''}
              </p>
            )}
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className={cn(
                  'h-full transition-all',
                  getProgressColor(stats.cpu.percentage),
                )}
                style={{ width: `${Math.min(stats.cpu.percentage, 100)}%` }}
                role="progressbar"
                aria-valuenow={stats.cpu.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`CPU usage: ${stats.cpu.percentage.toFixed(1)}%`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Memory Card */}
      {stats.memory && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick
              className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(stats.memory.usage)}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              of {formatBytes(stats.memory.limit)}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className={cn(
                  'h-full transition-all',
                  getProgressColor(stats.memory.percentage),
                )}
                style={{ width: `${Math.min(stats.memory.percentage, 100)}%` }}
                role="progressbar"
                aria-valuenow={stats.memory.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Memory usage: ${stats.memory.percentage.toFixed(1)}%`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network Card */}
      {stats.network && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network I/O</CardTitle>
            <Network
              className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Received
                </span>
                <span className="text-sm font-medium">
                  {formatBytes(stats.network.rx)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Transmitted
                </span>
                <span className="text-sm font-medium">
                  {formatBytes(stats.network.tx)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Block I/O Card */}
      {stats.blockIO && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk I/O</CardTitle>
            <HardDrive
              className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Read
                </span>
                <span className="text-sm font-medium">
                  {formatBytes(stats.blockIO.read)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Write
                </span>
                <span className="text-sm font-medium">
                  {formatBytes(stats.blockIO.write)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
