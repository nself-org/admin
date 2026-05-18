'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { ChartSkeleton } from '@/components/skeletons'
import { MobileDataCard } from '@/components/ui/responsive-table'
import {
  Activity,
  AlertCircle,
  BarChart3,
  Cpu,
  Download,
  HardDrive,
  Loader2,
  MemoryStick,
  Network,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface SystemMetrics {
  cpu: {
    usage: number
    cores: number
    temperature?: number
    frequency: number
    processes: number
  }
  memory: {
    total: number
    used: number
    free: number
    cached: number
    buffers: number
    usage: number
  }
  disk: {
    total: number
    used: number
    free: number
    usage: number
    disks: DiskInfo[]
  }
  network: {
    bytesIn: number
    bytesOut: number
    packetsIn: number
    packetsOut: number
    interfaces: NetworkInterface[]
  }
  containers: ContainerResource[]
  processes: ProcessInfo[]
  uptime: number
  loadAverage: number[]
}

interface DiskInfo {
  device: string
  mountpoint: string
  filesystem: string
  size: number
  used: number
  available: number
  usage: number
}

interface NetworkInterface {
  name: string
  bytesIn: number
  bytesOut: number
  packetsIn: number
  packetsOut: number
  speed: number
  status: 'up' | 'down'
}

interface ContainerResource {
  id: string
  name: string
  image: string
  cpuUsage: number
  memoryUsage: number
  memoryLimit: number
  networkIn: number
  networkOut: number
  diskRead: number
  diskWrite: number
  status: 'running' | 'stopped' | 'paused'
}

interface ProcessInfo {
  pid: number
  name: string
  user: string
  cpuUsage: number
  memoryUsage: number
  status: string
  runtime: number
  command: string
}

interface ResourceAlert {
  id: string
  type: 'cpu' | 'memory' | 'disk' | 'network'
  threshold: number
  condition: 'above' | 'below'
  enabled: boolean
  notification: 'email' | 'webhook' | 'both'
  lastTriggered?: string
}

function MetricsCard({
  title,
  value,
  unit,
  percentage,
  trend,
  icon: Icon,
  color = 'blue',
  details = [],
}: {
  title: string
  value: string | number
  unit?: string
  percentage?: number
  trend?: 'up' | 'down' | 'stable'
  icon: any
  color?: 'blue' | 'green' | 'red' | 'yellow'
  details?: string[]
}) {
  const colorClasses = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    red: 'text-red-500',
    yellow: 'text-yellow-500',
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Icon className={`h-5 w-5 ${colorClasses[color]}`} />
            <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</h3>
          </div>

          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</span>
            {unit && <span className="text-sm text-zinc-500">{unit}</span>}
          </div>

          {percentage !== undefined && (
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                <span>Usage</span>
                <span>{percentage.toFixed(1)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className={`h-full transition-all ${
                    percentage > 90
                      ? 'bg-red-500'
                      : percentage > 70
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          )}

          {details.length > 0 && (
            <div className="space-y-1">
              {details.map((detail, i) => (
                <div key={i} className="text-xs text-zinc-500">
                  {detail}
                </div>
              ))}
            </div>
          )}
        </div>

        {trend && (
          <div
            className={`flex items-center gap-1 ${
              trend === 'up'
                ? 'text-red-500'
                : trend === 'down'
                  ? 'text-green-500'
                  : 'text-zinc-500'
            }`}
          >
            <TrendIcon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  )
}

function ResourceChart({
  title,
  data,
  type: _type = 'line',
  height = 200,
}: {
  title: string
  data: Array<{ timestamp: string; value: number }>
  type?: 'line' | 'bar' | 'area'
  height?: number
}) {
  // This would integrate with a charting library like Chart.js or Recharts
  // For now, showing a placeholder
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-xs">
            <Download className="mr-1 h-3 w-3" />
            Export
          </Button>
          <select className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800">
            <option>Last Hour</option>
            <option>Last 6 Hours</option>
            <option>Last 24 Hours</option>
            <option>Last Week</option>
          </select>
        </div>
      </div>

      <div
        className="flex items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-900/50"
        style={{ height: `${height}px` }}
      >
        <div className="text-center text-zinc-500">
          <BarChart3 className="mx-auto mb-2 h-12 w-12 opacity-50" />
          <p className="text-sm">Interactive Chart Placeholder</p>
          <p className="text-xs">({data.length} data points)</p>
        </div>
      </div>
    </div>
  )
}

function DiskUsageBreakdown({ disks }: { disks: DiskInfo[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Disk Usage</h3>

      <div className="space-y-4">
        {disks.map((disk, index) => (
          <div key={index} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-zinc-500" />
                <span className="font-medium text-zinc-900 dark:text-white">{disk.device}</span>
                <span className="text-sm text-zinc-500">({disk.filesystem})</span>
              </div>
              <span className="text-sm text-zinc-500">{disk.mountpoint}</span>
            </div>

            <div className="mb-2 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
              <span>
                {(disk.used / 1024 ** 3).toFixed(1)} GB / {(disk.size / 1024 ** 3).toFixed(1)} GB
              </span>
              <span>{disk.usage.toFixed(1)}% used</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className={`h-full transition-all ${
                  disk.usage > 90
                    ? 'bg-red-500'
                    : disk.usage > 70
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(disk.usage, 100)}%` }}
              />
            </div>

            <div className="mt-2 text-xs text-zinc-500">
              Available: {(disk.available / 1024 ** 3).toFixed(1)} GB
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProcessManager({
  processes,
  onProcessAction,
}: {
  processes: ProcessInfo[]
  onProcessAction: (action: string, pid: number) => void
}) {
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'name'>('cpu')
  const [filterUser, setFilterUser] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const users = ['all', ...Array.from(new Set(processes.map((p) => p.user)))]

  const filteredProcesses = processes
    .filter((process) => {
      if (filterUser !== 'all' && process.user !== filterUser) return false
      if (
        searchQuery &&
        !process.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !process.command.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'cpu':
          return b.cpuUsage - a.cpuUsage
        case 'memory':
          return b.memoryUsage - a.memoryUsage
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })
    .slice(0, 20) // Top 20 processes

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 p-6 dark:border-zinc-700">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Process Manager</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="text-xs">
              <RefreshCw className="mr-1 h-3 w-3" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search processes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pr-4 pl-10 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            {users.map((user) => (
              <option key={user} value={user}>
                {user === 'all' ? 'All Users' : user}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'cpu' | 'memory' | 'name')}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="cpu">Sort by CPU</option>
            <option value="memory">Sort by Memory</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Desktop: Table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                PID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Process
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                CPU %
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Memory
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Runtime
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {filteredProcesses.map((process) => (
              <tr key={process.pid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-3 font-mono text-sm text-zinc-900 dark:text-white">
                  {process.pid}
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-white">
                      {process.name}
                    </div>
                    <div className="max-w-xs truncate font-mono text-xs text-zinc-500">
                      {process.command}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {process.user}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{process.cpuUsage.toFixed(1)}%</span>
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className={`h-full transition-all ${
                          process.cpuUsage > 50
                            ? 'bg-red-500'
                            : process.cpuUsage > 20
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(process.cpuUsage, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {(process.memoryUsage / 1024 ** 2).toFixed(1)} MB
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {formatUptime(process.runtime)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      process.status === 'running'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : process.status === 'sleeping'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}
                  >
                    {process.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onProcessAction('restart', process.pid)}
                      className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    >
                      <RotateCw className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onProcessAction('kill', process.pid)}
                      className="rounded p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Cards */}
      <div className="space-y-3 md:hidden">
        {filteredProcesses.map((process) => (
          <MobileDataCard
            key={process.pid}
            title={process.name}
            subtitle={`PID: ${process.pid} | User: ${process.user}`}
            data={[
              { label: 'CPU', value: `${process.cpuUsage.toFixed(1)}%` },
              {
                label: 'Memory',
                value: `${(process.memoryUsage / 1024 ** 2).toFixed(1)} MB`,
              },
              { label: 'Runtime', value: formatUptime(process.runtime) },
              { label: 'Status', value: process.status },
            ]}
            status={{
              text: process.status,
              color:
                process.status === 'running'
                  ? 'green'
                  : process.status === 'sleeping'
                    ? 'blue'
                    : 'zinc',
            }}
            actions={
              <>
                <button
                  onClick={() => onProcessAction('restart', process.pid)}
                  className="flex items-center gap-2 rounded bg-zinc-100 px-4 py-2 text-sm hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  <RotateCw className="h-4 w-4" />
                  Restart
                </button>
                <button
                  onClick={() => onProcessAction('kill', process.pid)}
                  className="flex items-center gap-2 rounded bg-red-100 px-4 py-2 text-sm text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                >
                  <X className="h-4 w-4" />
                  Kill
                </button>
              </>
            }
          />
        ))}
      </div>
    </div>
  )
}

function ContainerResourceAllocation({ containers }: { containers: ContainerResource[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 p-6 dark:border-zinc-700">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Container Resource Allocation
        </h3>
      </div>

      <div className="p-6">
        <div className="grid gap-4">
          {containers.map((container) => (
            <div
              key={container.id}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-zinc-900 dark:text-white">{container.name}</h4>
                  <p className="font-mono text-sm text-zinc-500">{container.image}</p>
                </div>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    container.status === 'running'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : container.status === 'stopped'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                  }`}
                >
                  {container.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                    <span>CPU</span>
                    <span>{container.cpuUsage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(container.cpuUsage, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                    <span>Memory</span>
                    <span>
                      {((container.memoryUsage / container.memoryLimit) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{
                        width: `${Math.min((container.memoryUsage / container.memoryLimit) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {(container.memoryUsage / 1024 ** 2).toFixed(1)} MB /{' '}
                    {(container.memoryLimit / 1024 ** 2).toFixed(1)} MB
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs text-zinc-500">Network I/O</div>
                  <div className="text-xs">
                    <div className="text-green-600">
                      ↓ {(container.networkIn / 1024 ** 2).toFixed(1)} MB
                    </div>
                    <div className="text-blue-600">
                      ↑ {(container.networkOut / 1024 ** 2).toFixed(1)} MB
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs text-zinc-500">Disk I/O</div>
                  <div className="text-xs">
                    <div className="text-green-600">
                      Read: {(container.diskRead / 1024 ** 2).toFixed(1)} MB
                    </div>
                    <div className="text-red-600">
                      Write: {(container.diskWrite / 1024 ** 2).toFixed(1)} MB
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResourceAlerts({
  alerts,
  onAlertUpdate,
}: {
  alerts: ResourceAlert[]
  onAlertUpdate: (alert: ResourceAlert) => void
}) {
  const [_isCreating, setIsCreating] = useState(false)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 p-6 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Resource Alerts</h3>
          <Button onClick={() => setIsCreating(true)} className="text-sm">
            <Plus className="mr-1 h-4 w-4" />
            Add Alert
          </Button>
        </div>
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <h4 className="font-medium text-zinc-900 dark:text-white">
                    {alert.type.toUpperCase()} Alert
                  </h4>
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      alert.enabled
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}
                  >
                    {alert.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Trigger when {alert.type} usage is {alert.condition} {alert.threshold}%
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>Notification: {alert.notification}</span>
                  {alert.lastTriggered && (
                    <span>Last triggered: {new Date(alert.lastTriggered).toLocaleString()}</span>
                  )}
                </div>
              </div>

              <div className="ml-4 flex items-center gap-2">
                <Button
                  onClick={() => onAlertUpdate({ ...alert, enabled: !alert.enabled })}
                  variant="outline"
                  className="text-xs"
                >
                  {alert.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button variant="outline" className="text-xs">
                  Edit
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SystemResourcesContent() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [alerts, setAlerts] = useState<ResourceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'processes' | 'containers' | 'alerts'
  >('overview')
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/system/resources')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Failed to fetch metrics')
      setMetrics(data.metrics as SystemMetrics)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system metrics')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [fetchMetrics, autoRefresh])

  const handleProcessAction = (_action: string, _pid: number) => {
    // Process action logic would go here
  }

  const handleAlertUpdate = (alert: ResourceAlert) => {
    setAlerts((prev) => prev.map((a) => (a.id === alert.id ? alert : a)))
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-zinc-600 dark:text-zinc-400">Loading system metrics...</span>
          </div>
        </div>
      </>
    )
  }

  if (!metrics) {
    return (
      <>
        <HeroPattern />
        <div className="mx-auto max-w-7xl">
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
              Unable to load system metrics
            </h2>
            <p className="mb-4 text-zinc-600 dark:text-zinc-400">
              {error || 'An unexpected error occurred'}
            </p>
            <Button onClick={fetchMetrics}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </>
    )
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">System Resources</h1>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Monitor CPU, memory, disk, and network usage
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh
              </label>
              <Button onClick={fetchMetrics} variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="mb-6 flex w-fit items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                selectedTab === 'overview'
                  ? 'bg-blue-500 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('processes')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                selectedTab === 'processes'
                  ? 'bg-blue-500 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              Processes
            </button>
            <button
              onClick={() => setSelectedTab('containers')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                selectedTab === 'containers'
                  ? 'bg-blue-500 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              Containers
            </button>
            <button
              onClick={() => setSelectedTab('alerts')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                selectedTab === 'alerts'
                  ? 'bg-blue-500 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              Alerts
            </button>
          </div>
        </div>

        {selectedTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <MetricsCard
                title="CPU Usage"
                value={metrics.cpu.usage.toFixed(1)}
                unit="%"
                percentage={metrics.cpu.usage}
                trend={metrics.cpu.usage > 50 ? 'up' : 'stable'}
                icon={Cpu}
                color={metrics.cpu.usage > 80 ? 'red' : metrics.cpu.usage > 50 ? 'yellow' : 'green'}
                details={[
                  `${metrics.cpu.cores} cores @ ${metrics.cpu.frequency} GHz`,
                  `${metrics.cpu.processes} processes`,
                  metrics.cpu.temperature ? `${metrics.cpu.temperature}°C` : '',
                ].filter(Boolean)}
              />

              <MetricsCard
                title="Memory"
                value={formatBytes(metrics.memory.used)}
                percentage={metrics.memory.usage}
                trend={metrics.memory.usage > 70 ? 'up' : 'stable'}
                icon={MemoryStick}
                color={
                  metrics.memory.usage > 90 ? 'red' : metrics.memory.usage > 70 ? 'yellow' : 'green'
                }
                details={[
                  `Total: ${formatBytes(metrics.memory.total)}`,
                  `Free: ${formatBytes(metrics.memory.free)}`,
                  `Cached: ${formatBytes(metrics.memory.cached)}`,
                ]}
              />

              <MetricsCard
                title="Disk Usage"
                value={formatBytes(metrics.disk.used)}
                percentage={metrics.disk.usage}
                trend="stable"
                icon={HardDrive}
                color={
                  metrics.disk.usage > 90 ? 'red' : metrics.disk.usage > 70 ? 'yellow' : 'green'
                }
                details={[
                  `Total: ${formatBytes(metrics.disk.total)}`,
                  `Free: ${formatBytes(metrics.disk.free)}`,
                  `${metrics.disk.disks.length} drives`,
                ]}
              />

              <MetricsCard
                title="Network"
                value={formatBytes(metrics.network.bytesIn + metrics.network.bytesOut)}
                trend="up"
                icon={Network}
                color="blue"
                details={[
                  `In: ${formatBytes(metrics.network.bytesIn)}`,
                  `Out: ${formatBytes(metrics.network.bytesOut)}`,
                  `${metrics.network.interfaces.length} interfaces`,
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ResourceChart
                title="CPU History"
                data={[
                  { timestamp: '10:00', value: 35 },
                  { timestamp: '10:15', value: 42 },
                  { timestamp: '10:30', value: 38 },
                  { timestamp: '10:45', value: 45 },
                ]}
              />

              <ResourceChart
                title="Memory History"
                data={[
                  { timestamp: '10:00', value: 48 },
                  { timestamp: '10:15', value: 52 },
                  { timestamp: '10:30', value: 51 },
                  { timestamp: '10:45', value: 53 },
                ]}
              />
            </div>

            <DiskUsageBreakdown disks={metrics.disk.disks} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                  System Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Uptime</span>
                    <span className="font-medium">{formatUptime(metrics.uptime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Load Average</span>
                    <span className="font-medium">{metrics.loadAverage.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Running Processes</span>
                    <span className="font-medium">{metrics.cpu.processes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Active Containers</span>
                    <span className="font-medium">
                      {metrics.containers.filter((c) => c.status === 'running').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                  Network Interfaces
                </h3>
                <div className="space-y-3">
                  {metrics.network.interfaces.map((interface_) => (
                    <div
                      key={interface_.name}
                      className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${interface_.status === 'up' ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <span className="font-medium">{interface_.name}</span>
                        <span className="text-sm text-zinc-500">{interface_.speed} Mbps</span>
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        ↓{formatBytes(interface_.bytesIn)} ↑{formatBytes(interface_.bytesOut)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'processes' && (
          <ProcessManager processes={metrics.processes} onProcessAction={handleProcessAction} />
        )}

        {selectedTab === 'containers' && (
          <ContainerResourceAllocation containers={metrics.containers} />
        )}

        {selectedTab === 'alerts' && (
          <ResourceAlerts alerts={alerts} onAlertUpdate={handleAlertUpdate} />
        )}
      </div>
    </>
  )
}

export default function SystemResourcesPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <SystemResourcesContent />
    </Suspense>
  )
}
