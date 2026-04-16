'use client'

import { Button } from '@/components/Button'
import { DataSection, PageShell } from '@/components/PageShell'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import * as Icons from '@/lib/icons'
import type { ContainerStats } from '@/services/collectors/DockerAPICollector'
import { useProjectStore } from '@/stores/projectStore'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

// Dynamic imports for heavy components
const ServiceCard = dynamic(
  () =>
    import('@/components/services/ServiceCard').then((mod) => ({
      default: mod.ServiceCard,
    })),
  {
    loading: () => (
      <div className="h-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
    ),
  },
)

const _ServiceListView = dynamic(
  () =>
    import('@/components/services/ServiceListView').then((mod) => ({
      default: mod.ServiceListView,
    })),
  {
    loading: () => (
      <div className="h-96 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
    ),
  },
)

interface Container {
  id: string
  name: string
  image: string
  state: string
  status: string
  health?: 'healthy' | 'unhealthy' | 'starting' | 'stopped'
  ports?: { private: number; public: number; type: string }[]
  labels?: Record<string, string>
  created: number
  serviceType: string
  category: 'stack' | 'services'
  stats?: {
    cpu: { percentage: number; cores: number }
    memory: { usage: number; limit: number; percentage: number }
    network: { rx: number; tx: number }
    blockIO: { read: number; write: number }
    disk?: { used: number; total: number; percentage: number }
  }
  details?: {
    env: string[]
    mounts: any[]
    networkMode: string
    restartPolicy: any
    healthcheck: any
    labels: Record<string, string>
    command: string[]
    workingDir: string
    hostname: string
  }
}

// Category color scheme utility
function getCategoryColors(category: 'required' | 'optional' | 'user') {
  switch (category) {
    case 'required':
      return {
        badge:
          'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
        dot: 'bg-blue-500',
        icon: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/10',
        label: 'Required',
        color: 'blue',
      }
    case 'optional':
      return {
        badge:
          'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/50',
        dot: 'bg-sky-500',
        icon: 'text-sky-500 dark:text-sky-400',
        bg: 'bg-sky-50 dark:bg-sky-900/10',
        label: 'Optional',
        color: 'sky',
      }
    case 'user':
      return {
        badge:
          'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50',
        dot: 'bg-orange-500',
        icon: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-900/10',
        label: 'User',
        color: 'orange',
      }
  }
}

// Unified service categorization and ordering
function getServiceCategory(
  name: string | undefined,
): 'required' | 'optional' | 'user' {
  if (!name) return 'user'
  const lowerName = String(name).toLowerCase()

  // Required services (core stack)
  if (['postgres', 'postgresql'].some((n) => lowerName.includes(n)))
    return 'required'
  if (['hasura', 'graphql'].some((n) => lowerName.includes(n)))
    return 'required'
  if (
    ['auth'].some((n) => lowerName.includes(n)) &&
    !lowerName.includes('alert')
  )
    return 'required'
  if (
    ['nginx', 'proxy'].some((n) => lowerName.includes(n)) &&
    !lowerName.includes('haproxy')
  )
    return 'required'

  // Optional services (infrastructure)
  if (['minio', 'storage'].some((n) => lowerName.includes(n))) return 'optional'
  if (
    ['mailpit', 'mail'].some((n) => lowerName.includes(n)) &&
    !lowerName.includes('bullmq')
  )
    return 'optional'
  if (['redis', 'cache'].some((n) => lowerName.includes(n))) return 'optional'
  if (
    ['grafana', 'prometheus', 'loki', 'jaeger', 'alertmanager'].some((n) =>
      lowerName.includes(n),
    )
  )
    return 'optional'

  // Everything else is custom services (including BullMQ workers)
  return 'user'
}

// Get service order within its category for consistent default sorting
function getServiceOrder(name: string | undefined): number {
  if (!name) return 999
  const lowerName = name.toLowerCase()
  const category = getServiceCategory(name)

  if (category === 'required') {
    // Required services order: PostgreSQL → Hasura → Auth → Nginx
    if (lowerName.includes('postgres')) return 100
    if (lowerName.includes('hasura')) return 101
    if (lowerName.includes('auth')) return 102
    if (lowerName.includes('nginx')) return 103
    return 199 // Other required services
  }

  if (category === 'optional') {
    // Optional services order: MinIO → Storage → Redis → Mailpit → Monitoring stack
    if (lowerName.includes('minio')) return 200
    if (
      lowerName === 'nself_storage' ||
      lowerName === 'nself-storage' ||
      (lowerName.includes('storage') && !lowerName.includes('minio'))
    )
      return 201
    if (lowerName.includes('redis')) return 202
    if (lowerName.includes('mailpit')) return 203
    if (lowerName.includes('grafana')) return 204
    if (lowerName.includes('prometheus')) return 205
    if (lowerName.includes('loki')) return 206
    if (lowerName.includes('jaeger')) return 207
    if (lowerName.includes('alertmanager')) return 208
    return 299 // Other optional services
  }

  // User services - group by type then alphabetical
  // BullMQ workers (300-399)
  if (lowerName.includes('bullmq') || lowerName.includes('bull')) {
    if (lowerName.includes('email')) return 300
    if (lowerName.includes('notification')) return 301
    return 310 + name.charCodeAt(0) // Alphabetical within BullMQ
  }

  // NestJS services (400-499)
  if (lowerName.includes('nest')) {
    if (lowerName.includes('api')) return 400
    if (lowerName.includes('worker')) return 401
    return 410 + name.charCodeAt(0) // Alphabetical within NestJS
  }

  // Go services (500-599)
  if (lowerName.includes('golang') || lowerName.includes('go-')) {
    if (lowerName.includes('analytics')) return 500
    if (lowerName.includes('websocket')) return 501
    return 510 + name.charCodeAt(0) // Alphabetical within Go
  }

  // Python services (600-699)
  if (lowerName.includes('python') || lowerName.includes('py-')) {
    if (lowerName.includes('ml')) return 600
    if (lowerName.includes('processor')) return 601
    return 610 + name.charCodeAt(0) // Alphabetical within Python
  }

  // Other custom services (700+)
  return 700 + name.charCodeAt(0)
}

// Apply default sorting to containers
function applyDefaultSort(containers: any[]): any[] {
  return [...containers].sort((a, b) => {
    const orderA = getServiceOrder(a.name || '')
    const orderB = getServiceOrder(b.name || '')
    if (orderA !== orderB) return orderA - orderB
    // If same order number, sort alphabetically
    return (a.name || '').localeCompare(b.name || '')
  })
}

const serviceIcons: Record<string, any> = {
  database: Icons.Database,
  graphql: Icons.Layers,
  auth: Icons.Shield,
  storage: Icons.HardDrive,
  cache: Icons.Server,
  proxy: Icons.Globe,
  email: Icons.Mail,
  monitoring: Icons.Activity,
  metrics: Icons.Activity,
  logs: Icons.FileText,
  tracing: Icons.Activity,
  alerts: Icons.AlertCircle,
  nestjs: Icons.Server,
  queue: Icons.Clock,
  python: Icons.Terminal,
  golang: Icons.Cpu,
  functions: Icons.Zap,
  default: Icons.Box,
}

function getServiceIcon(name: string): any {
  const iconMap: Record<string, any> = {
    postgres: Icons.Database,
    hasura: Icons.Layers,
    auth: Icons.Shield,
    minio: Icons.HardDrive,
    redis: Icons.Database,
    nginx: Icons.Globe,
    mailhog: Icons.Mail,
  }

  for (const [key, icon] of Object.entries(iconMap)) {
    if (name.toLowerCase().includes(key)) return icon
  }
  return Icons.Box
}

function getHealthColor(health: string): string {
  switch (health) {
    case 'healthy':
      return 'text-green-500'
    case 'unhealthy':
      return 'text-red-500'
    case 'starting':
      return 'text-yellow-500'
    default:
      return 'text-zinc-400'
  }
}

function getHealthText(health: string): string {
  return health?.charAt(0).toUpperCase() + health?.slice(1) || 'Unknown'
}

function getServiceDisplayName(
  container: Container | ContainerStats | any,
): string {
  const nameMap: Record<string, string> = {
    nself_postgres: 'PostgreSQL',
    nself_hasura: 'Hasura GraphQL',
    nself_auth: 'Hasura Auth',
    nself_minio: 'MinIO Storage',
    nself_storage: 'Storage Volume',
    'nself-storage': 'Storage Volume',
    nself_nginx: 'Nginx Proxy',
    nself_mailpit: 'Mailpit',
    'nself-redis': 'Redis Cache',
    'nself-grafana': 'Grafana',
    'nself-prometheus': 'Prometheus',
    'nself-loki': 'Loki Logs',
    'nself-jaeger': 'Jaeger Tracing',
    'nself-alertmanager': 'AlertManager',
    'nself-nestjs-api': 'NestJS API',
    'nself-nestjs-worker': 'NestJS Worker',
    'nself-bullmq-email': 'BullMQ Email',
    'nself-bullmq-notifications': 'BullMQ Notifications',
    'nself-python-ml': 'Python ML',
    'nself-python-processor': 'Python Processor',
    'nself-golang-analytics': 'Go Analytics',
    'nself-golang-websocket': 'Go WebSocket',
  }

  return nameMap[container.name] || container.name
}

// Enhanced List View Component with sorting
function EnhancedListView({
  containers,
  onAction,
}: {
  containers: Container[]
  onAction: (action: string, containerId: string) => void
}) {
  const [sortColumn, setSortColumn] = useState<
    'name' | 'status' | 'cpu' | 'memory' | 'disk' | 'ports' | null
  >(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Sort containers - use default sort when no column selected
  const sortedContainers = useMemo(() => {
    if (!sortColumn) return containers // Already sorted by default

    return [...containers].sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case 'name':
          comparison = getServiceDisplayName(a).localeCompare(
            getServiceDisplayName(b),
          )
          break
        case 'status':
          comparison = (a.health || 'stopped').localeCompare(
            b.health || 'stopped',
          )
          break
        case 'cpu':
          comparison =
            (a.stats?.cpu.percentage || 0) - (b.stats?.cpu.percentage || 0)
          break
        case 'memory':
          comparison =
            (a.stats?.memory.usage || 0) - (b.stats?.memory.usage || 0)
          break
        case 'disk': {
          const diskA =
            a.stats?.disk?.used ||
            (a.stats?.blockIO
              ? a.stats.blockIO.read + a.stats.blockIO.write
              : 0)
          const diskB =
            b.stats?.disk?.used ||
            (b.stats?.blockIO
              ? b.stats.blockIO.read + b.stats.blockIO.write
              : 0)
          comparison = diskA - diskB
          break
        }
        case 'ports': {
          const portA = a.ports?.find((p) => p.public)?.public || 0
          const portB = b.ports?.find((p) => p.public)?.public || 0
          comparison = portA - portB
          break
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [containers, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: typeof sortColumn }) => {
    if (sortColumn !== column) {
      return (
        <Icons.ArrowUp className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100" />
      )
    }
    return sortDirection === 'asc' ? (
      <Icons.ArrowUp className="h-3 w-3 text-blue-500" />
    ) : (
      <Icons.ArrowDown className="h-3 w-3 text-blue-500" />
    )
  }

  // Group by category for visual separation
  const requiredContainers = sortedContainers.filter(
    (c) => getServiceCategory(c.name) === 'required',
  )
  const optionalContainers = sortedContainers.filter(
    (c) => getServiceCategory(c.name) === 'optional',
  )
  const userContainers = sortedContainers.filter(
    (c) => getServiceCategory(c.name) === 'user',
  )

  // Function to get service icon
  function getServiceIcon(name: string | undefined): any {
    if (!name) return serviceIcons.default
    const lowerName = name.toLowerCase()

    if (lowerName.includes('postgres')) return serviceIcons.database
    if (lowerName.includes('hasura')) return serviceIcons.graphql
    if (lowerName.includes('auth')) return serviceIcons.auth
    if (lowerName.includes('minio') || lowerName.includes('storage'))
      return serviceIcons.storage
    if (lowerName.includes('redis')) return serviceIcons.cache
    if (lowerName.includes('nginx')) return serviceIcons.proxy
    if (lowerName.includes('mailpit')) return serviceIcons.email
    if (lowerName.includes('grafana') || lowerName.includes('prometheus'))
      return serviceIcons.monitoring
    if (lowerName.includes('loki')) return serviceIcons.logs
    if (lowerName.includes('jaeger')) return serviceIcons.tracing
    if (lowerName.includes('alertmanager')) return serviceIcons.alerts
    if (lowerName.includes('nestjs')) return serviceIcons.nestjs
    if (lowerName.includes('bullmq')) return serviceIcons.queue
    if (lowerName.includes('python')) return serviceIcons.python
    if (lowerName.includes('golang') || lowerName.includes('go-'))
      return serviceIcons.golang

    return serviceIcons.default
  }

  // Function to get status config
  function getStatusConfig(container: Container) {
    if (container.state === 'running') {
      if (container.health === 'healthy') {
        return {
          dotColor: 'bg-green-500',
          textColor: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          text: 'Healthy',
        }
      } else if (container.health === 'unhealthy') {
        return {
          dotColor: 'bg-red-500',
          textColor: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          text: 'Unhealthy',
        }
      } else if (container.health === 'starting') {
        return {
          dotColor: 'bg-yellow-500 animate-pulse',
          textColor: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          text: 'Starting',
        }
      }
      return {
        dotColor: 'bg-blue-500',
        textColor: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        text: 'Running',
      }
    } else {
      return {
        dotColor: 'bg-zinc-400',
        textColor: 'text-zinc-500',
        bgColor: 'bg-zinc-50 dark:bg-zinc-900/20',
        borderColor: 'border-zinc-200 dark:border-zinc-800',
        text: 'Stopped',
      }
    }
  }

  const ContainerRow = ({ container }: { container: Container }) => {
    const categoryColors = getCategoryColors(getServiceCategory(container.name))
    const Icon = getServiceIcon(container.name)
    const displayName = getServiceDisplayName(container)
    const config = getStatusConfig(container)

    // Format uptime from created timestamp
    const uptime = useMemo(() => {
      if (container.state !== 'running') return null
      const now = Date.now() / 1000
      const uptimeSeconds = now - container.created
      const days = Math.floor(uptimeSeconds / 86400)
      const hours = Math.floor((uptimeSeconds % 86400) / 3600)
      const minutes = Math.floor((uptimeSeconds % 3600) / 60)

      if (days > 0) return `${days}d ${hours}h`
      if (hours > 0) return `${hours}h ${minutes}m`
      return `${minutes}m`
    }, [container.created, container.state])

    return (
      <tr
        key={container.id}
        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${config.dotColor}`} />
              <Icon className={`h-5 w-5 ${categoryColors.icon}`} />
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-900 dark:text-white">
                {displayName}
              </div>
              <div className="text-xs text-zinc-500">{container.name}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div>
            <span className={`text-sm ${config.textColor}`}>{config.text}</span>
            {container.state === 'running' && (
              <div className="mt-0.5 text-xs text-zinc-500">
                Uptime: {uptime}
              </div>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          {container.stats ? (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {container.stats.cpu.percentage.toFixed(0)}%
            </span>
          ) : (
            <span className="text-sm text-zinc-400">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          {container.stats ? (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {(container.stats.memory.usage / (1024 * 1024 * 1024)).toFixed(1)}
              G
            </span>
          ) : (
            <span className="text-sm text-zinc-400">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          {container.stats ? (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {(() => {
                if (container.stats?.disk?.used) {
                  const gb = container.stats.disk.used / (1024 * 1024 * 1024)
                  return gb >= 1
                    ? `${gb.toFixed(1)}G`
                    : `${(container.stats.disk.used / (1024 * 1024)).toFixed(0)}M`
                } else if (container.stats?.blockIO) {
                  const total =
                    container.stats.blockIO.read + container.stats.blockIO.write
                  const gb = total / (1024 * 1024 * 1024)
                  return gb >= 1
                    ? `${gb.toFixed(1)}G`
                    : `${(total / (1024 * 1024)).toFixed(0)}M`
                }
                return '-'
              })()}
            </span>
          ) : (
            <span className="text-sm text-zinc-400">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          {container.ports && container.ports.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-1">
              {container.ports
                .filter((p) => p.public)
                .map((port, i) => (
                  <span
                    key={i}
                    className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800"
                  >
                    {port.public}
                  </span>
                ))}
            </div>
          ) : (
            <span className="text-sm text-zinc-400">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {container.state === 'running' ? (
              <>
                <button
                  onClick={() => onAction('restart', container.id)}
                  className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Icons.RefreshCw className="h-4 w-4 text-zinc-500" />
                </button>
                <button
                  onClick={() => onAction('stop', container.id)}
                  className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Icons.Square className="h-4 w-4 text-red-500" />
                </button>
              </>
            ) : (
              <button
                onClick={() => onAction('start', container.id)}
                className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Icons.Play className="h-4 w-4 text-green-500" />
              </button>
            )}
            <button
              onClick={() => onAction('inspect', container.id)}
              className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Icons.Info className="h-4 w-4 text-zinc-500" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900/50 dark:ring-zinc-700">
      <table className="w-full">
        <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
          <tr>
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort('name')}
                className="group flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Service <SortIcon column="name" />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort('status')}
                className="group flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Status <SortIcon column="status" />
              </button>
            </th>
            <th className="px-4 py-3 text-center">
              <button
                onClick={() => handleSort('cpu')}
                className="group mx-auto flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                CPU <SortIcon column="cpu" />
              </button>
            </th>
            <th className="px-4 py-3 text-center">
              <button
                onClick={() => handleSort('memory')}
                className="group mx-auto flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Memory <SortIcon column="memory" />
              </button>
            </th>
            <th className="px-4 py-3 text-center">
              <button
                onClick={() => handleSort('disk')}
                className="group mx-auto flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Disk <SortIcon column="disk" />
              </button>
            </th>
            <th className="px-4 py-3 text-center">
              <button
                onClick={() => handleSort('ports')}
                className="group mx-auto flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Ports <SortIcon column="ports" />
              </button>
            </th>
            <th className="px-4 py-3 text-right">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Actions
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {requiredContainers.length > 0 && (
            <>
              <tr>
                <td
                  colSpan={7}
                  className="bg-blue-50/50 px-4 py-2 dark:bg-blue-900/10"
                >
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                    Required Services
                  </span>
                </td>
              </tr>
              {requiredContainers.map((container) => (
                <ContainerRow key={container.id} container={container} />
              ))}
            </>
          )}

          {optionalContainers.length > 0 && (
            <>
              <tr>
                <td
                  colSpan={7}
                  className="bg-sky-50/50 px-4 py-2 dark:bg-sky-900/10"
                >
                  <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
                    Optional Services
                  </span>
                </td>
              </tr>
              {optionalContainers.map((container) => (
                <ContainerRow key={container.id} container={container} />
              ))}
            </>
          )}

          {userContainers.length > 0 && (
            <>
              <tr>
                <td
                  colSpan={7}
                  className="bg-orange-50/50 px-4 py-2 dark:bg-orange-900/10"
                >
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                    Custom Services
                  </span>
                </td>
              </tr>
              {userContainers.map((container) => (
                <ContainerRow key={container.id} container={container} />
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}

// Metric card component
function MetricCard({
  title,
  value,
  percentage,
  description,
  icon: Icon,
}: {
  title: string
  value: any
  percentage?: number
  description: string
  icon: any
}) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const rect = event.currentTarget.getBoundingClientRect()
      mouseX.set(event.clientX - rect.left)
      mouseY.set(event.clientY - rect.top)
    },
    [mouseX, mouseY],
  )

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden rounded-3xl bg-zinc-50 ring-1 ring-zinc-200 transition-all hover:ring-2 hover:ring-blue-500/20 dark:bg-zinc-800/50 dark:ring-zinc-700 dark:hover:ring-blue-400/20"
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              rgba(59, 130, 246, 0.1),
              transparent 40%
            )
          `,
        }}
      />

      <div className="p-6">
        <div className="flex items-center justify-between">
          <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          {percentage !== undefined && !isNaN(percentage) && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {title}
          </h3>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// Tree View Component
function TreeView({
  containers,
  onAction,
}: {
  containers: Container[]
  onAction: (action: string, containerId: string) => void
}) {
  const requiredServices = containers.filter(
    (c) => getServiceCategory(c.name) === 'required',
  )
  const optionalServices = containers.filter(
    (c) => getServiceCategory(c.name) === 'optional',
  )
  const userServices = containers.filter(
    (c) => getServiceCategory(c.name) === 'user',
  )

  const TreeNode = ({
    container,
    indent = 0,
  }: {
    container: Container
    indent?: number
  }) => {
    const categoryColors = getCategoryColors(getServiceCategory(container.name))
    const Icon = getServiceIcon(container.name)
    const displayName = getServiceDisplayName(container)
    const config = getStatusConfig(container)

    return (
      <div
        className="flex items-center gap-3 rounded-lg px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        style={{ paddingLeft: `${indent + 16}px` }}
      >
        <div className={`h-2 w-2 rounded-full ${config.dotColor}`} />
        <Icon className={`h-5 w-5 ${categoryColors.icon}`} />
        <div className="flex-1">
          <div className="text-sm font-medium text-zinc-900 dark:text-white">
            {displayName}
          </div>
          <div className="text-xs text-zinc-500">{container.name}</div>
        </div>
        <span className={`text-sm ${config.textColor}`}>{config.text}</span>
        <div className="flex items-center gap-1">
          {container.state === 'running' ? (
            <>
              <button
                onClick={() => onAction('restart', container.id)}
                className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Icons.RefreshCw className="h-4 w-4 text-zinc-500" />
              </button>
              <button
                onClick={() => onAction('stop', container.id)}
                className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Icons.Square className="h-4 w-4 text-red-500" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onAction('start', container.id)}
              className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Icons.Play className="h-4 w-4 text-green-500" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Function to get status config
  function getStatusConfig(container: Container) {
    if (container.state === 'running') {
      if (container.health === 'healthy') {
        return {
          dotColor: 'bg-green-500',
          textColor: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          text: 'Healthy',
        }
      } else if (container.health === 'unhealthy') {
        return {
          dotColor: 'bg-red-500',
          textColor: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          text: 'Unhealthy',
        }
      } else if (container.health === 'starting') {
        return {
          dotColor: 'bg-yellow-500 animate-pulse',
          textColor: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          text: 'Starting',
        }
      }
      return {
        dotColor: 'bg-blue-500',
        textColor: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        text: 'Running',
      }
    } else {
      return {
        dotColor: 'bg-zinc-400',
        textColor: 'text-zinc-500',
        bgColor: 'bg-zinc-50 dark:bg-zinc-900/20',
        borderColor: 'border-zinc-200 dark:border-zinc-800',
        text: 'Stopped',
      }
    }
  }

  // Function to get service icon
  function getServiceIcon(name: string | undefined): any {
    if (!name) return serviceIcons.default
    const lowerName = name.toLowerCase()

    if (lowerName.includes('postgres')) return serviceIcons.database
    if (lowerName.includes('hasura')) return serviceIcons.graphql
    if (lowerName.includes('auth')) return serviceIcons.auth
    if (lowerName.includes('minio') || lowerName.includes('storage'))
      return serviceIcons.storage
    if (lowerName.includes('redis')) return serviceIcons.cache
    if (lowerName.includes('nginx')) return serviceIcons.proxy
    if (lowerName.includes('mailpit')) return serviceIcons.email
    if (lowerName.includes('grafana') || lowerName.includes('prometheus'))
      return serviceIcons.monitoring
    if (lowerName.includes('loki')) return serviceIcons.logs
    if (lowerName.includes('jaeger')) return serviceIcons.tracing
    if (lowerName.includes('alertmanager')) return serviceIcons.alerts
    if (lowerName.includes('nestjs')) return serviceIcons.nestjs
    if (lowerName.includes('bullmq')) return serviceIcons.queue
    if (lowerName.includes('python')) return serviceIcons.python
    if (lowerName.includes('golang') || lowerName.includes('go-'))
      return serviceIcons.golang

    return serviceIcons.default
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900/50 dark:ring-zinc-700">
      {requiredServices.length > 0 && (
        <div className="border-b border-zinc-200 dark:border-zinc-700">
          <div className="bg-blue-50/50 px-4 py-3 dark:bg-blue-900/10">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
              Required Services
            </span>
          </div>
          {requiredServices.map((container) => (
            <TreeNode key={container.id} container={container} />
          ))}
        </div>
      )}

      {optionalServices.length > 0 && (
        <div className="border-b border-zinc-200 dark:border-zinc-700">
          <div className="bg-sky-50/50 px-4 py-3 dark:bg-sky-900/10">
            <span className="text-sm font-medium text-sky-600 dark:text-sky-400">
              Optional Services
            </span>
          </div>
          {optionalServices.map((container) => (
            <TreeNode key={container.id} container={container} />
          ))}
        </div>
      )}

      {userServices.length > 0 && (
        <div>
          <div className="bg-orange-50/50 px-4 py-3 dark:bg-orange-900/10">
            <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
              Custom Services
            </span>
          </div>
          {userServices.map((container) => (
            <TreeNode key={container.id} container={container} />
          ))}
        </div>
      )}
    </div>
  )
}

function ServicesContent() {
  // Read from store - instant, never blocks
  const storeContainers = useProjectStore((state) => state.containerStats)
  const isLoadingContainers = useProjectStore(
    (state) => state.isLoadingContainers,
  )
  const fetchContainerStats = useProjectStore(
    (state) => state.fetchContainerStats,
  )
  const containers = useMemo(
    () => storeContainers || ([] as Container[]),
    [storeContainers],
  )

  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'tree'>('grid')
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContainers, setSelectedContainers] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'status' | 'cpu'>(
    'default',
  )

  // Fetch container stats on mount and set up auto-refresh
  useEffect(() => {
    fetchContainerStats()
    const interval = setInterval(fetchContainerStats, 3000) // Refresh every 3s
    return () => clearInterval(interval)
  }, [fetchContainerStats])

  const handleContainerAction = async (action: string, containerId: string) => {
    try {
      const response = await fetch('/api/docker/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, containerId }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error)
      }
    } catch (_err) {
      setError(`Failed to ${action} container`)
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedContainers.length === 0) return

    try {
      const response = await fetch('/api/docker/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, containerIds: selectedContainers }),
      })

      const data = await response.json()

      if (data.success) {
        setSelectedContainers([])
      } else {
        setError(data.error)
      }
    } catch (_err) {
      setError(`Failed to ${action} containers`)
    }
  }

  // Apply filtering - include search (ensure filter is always a function)
  const filteredContainers = useMemo(() => {
    let filtered = containers

    // Apply filter
    if (filter !== 'all') {
      filtered = filtered.filter((c) => {
        switch (filter) {
          case 'running':
            return c.state === 'running'
          case 'stopped':
            return c.state !== 'running'
          case 'stack':
            return c.category === 'stack'
          case 'services':
            return c.category === 'services'
          case 'healthy':
            return c.health === 'healthy'
          case 'unhealthy':
            return c.health === 'unhealthy'
          default:
            return true
        }
      })
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter((c) => {
        const displayName = getServiceDisplayName(c).toLowerCase()
        const containerName = (c.name || '').toLowerCase()
        const search = searchQuery.toLowerCase()
        return displayName.includes(search) || containerName.includes(search)
      })
    }

    return filtered
  }, [containers, filter, searchQuery])

  // Apply sorting
  const sortedContainers = useMemo(() => {
    if (sortBy === 'default') {
      return applyDefaultSort(filteredContainers)
    }

    return [...filteredContainers].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return getServiceDisplayName(a).localeCompare(
            getServiceDisplayName(b),
          )
        case 'status':
          return (a.state || '').localeCompare(b.state || '')
        case 'cpu':
          return (b.stats?.cpu.percentage || 0) - (a.stats?.cpu.percentage || 0)
        default:
          return 0
      }
    })
  }, [filteredContainers, sortBy])

  const handleViewModeChange = (mode: 'grid' | 'list' | 'tree') => {
    setViewMode(mode)
  }

  const handleRefresh = () => {
    fetchContainerStats()
  }

  const toggleSelectAll = () => {
    if (selectedContainers.length === sortedContainers.length) {
      setSelectedContainers([])
    } else {
      setSelectedContainers(sortedContainers.map((c) => c.id))
    }
  }

  const toggleSelectContainer = (id: string) => {
    setSelectedContainers((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id],
    )
  }

  const stats = useMemo(() => {
    const hasData = containers.length > 0
    if (!hasData) {
      return {
        total: '...',
        running: '...',
        stopped: '...',
        healthy: '...',
        unhealthy: '...',
        stack: '...',
        services: '...',
      }
    }
    return {
      total: containers.length,
      running: containers.filter((c) => c.state === 'running').length,
      stopped: containers.filter((c) => c.state !== 'running').length,
      healthy: containers.filter((c) => c.health === 'healthy').length,
      unhealthy: containers.filter((c) => c.health === 'unhealthy').length,
      stack: containers.filter((c) => c.category === 'stack').length,
      services: containers.filter((c) => c.category === 'services').length,
    }
  }, [containers])

  return (
    <PageShell
      description="Manage all containers and services in your nself stack"
      loading={false}
      error={error}
    >
      {/* Top 4 Metric Cards */}
      <div className="mb-16">
        <div className="not-prose grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Services"
            value={stats.total}
            percentage={
              typeof stats.running === 'number' &&
              typeof stats.total === 'number'
                ? (stats.running / stats.total) * 100
                : undefined
            }
            description={`${stats.stack} stack, ${stats.services} user`}
            icon={Icons.Server}
          />

          <MetricCard
            title="Running"
            value={stats.running}
            percentage={
              typeof stats.running === 'number' &&
              typeof stats.total === 'number'
                ? (stats.running / stats.total) * 100
                : undefined
            }
            description={`${typeof stats.total === 'number' && typeof stats.running === 'number' ? stats.total - stats.running : '...'} stopped`}
            icon={Icons.CheckCircle}
          />

          <MetricCard
            title="Health Status"
            value={`${stats.healthy}/${stats.total}`}
            percentage={
              typeof stats.healthy === 'number' &&
              typeof stats.total === 'number'
                ? (stats.healthy / stats.total) * 100
                : undefined
            }
            description={`${stats.unhealthy} unhealthy`}
            icon={Icons.Activity}
          />

          <MetricCard
            title="Stack vs User"
            value={`${stats.stack}/${stats.services}`}
            percentage={
              typeof stats.stack === 'number' && typeof stats.total === 'number'
                ? (stats.stack / stats.total) * 100
                : undefined
            }
            description="Stack / Custom Services"
            icon={Icons.Layers}
          />
        </div>
      </div>

      {/* Controls Bar */}
      <div className="mb-8">
        {/* Top row: Search, Filters, Sort */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative max-w-md min-w-[200px] flex-1">
            <Icons.Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pr-4 pl-10 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-blue-400"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-blue-400"
          >
            <option value="all">All Services</option>
            <option value="running">Running Only</option>
            <option value="stopped">Stopped Only</option>
            <option value="healthy">Healthy Only</option>
            <option value="unhealthy">Unhealthy Only</option>
            <option value="stack">Stack Services</option>
            <option value="services">Custom Services</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'default' | 'name' | 'status' | 'cpu')
            }
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-blue-400"
          >
            <option value="default">Sort: Default</option>
            <option value="name">Sort: Name</option>
            <option value="status">Sort: Status</option>
            <option value="cpu">Sort: CPU Usage</option>
          </select>

          {/* Spacer */}
          <div className="min-w-[100px] flex-1" />

          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
            disabled={isLoadingContainers}
          >
            <Icons.RefreshCw
              className={`h-4 w-4 ${isLoadingContainers ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`rounded p-2 transition-colors ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}
              title="Grid view"
            >
              <Icons.LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`rounded p-2 transition-colors ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}
              title="List view"
            >
              <Icons.List className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('tree')}
              className={`rounded p-2 transition-colors ${viewMode === 'tree' ? 'bg-blue-500 text-white' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}
              title="Tree view"
            >
              <Icons.TreePine className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar (when items selected) */}
        {selectedContainers.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {selectedContainers.length === sortedContainers.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {selectedContainers.length} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleBulkAction('start')}
                variant="outline"
                className="text-xs"
              >
                <Icons.Play className="mr-1 h-3 w-3" />
                Start All
              </Button>
              <Button
                onClick={() => handleBulkAction('stop')}
                variant="outline"
                className="text-xs"
              >
                <Icons.Square className="mr-1 h-3 w-3" />
                Stop All
              </Button>
              <Button
                onClick={() => handleBulkAction('restart')}
                variant="outline"
                className="text-xs"
              >
                <Icons.RefreshCw className="mr-1 h-3 w-3" />
                Restart All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content View */}
      <DataSection loading={isLoadingContainers && containers.length === 0}>
        {isLoadingContainers && containers.length === 0 ? (
          <CardGridSkeleton cards={8} columns={4} />
        ) : sortedContainers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-16 dark:border-zinc-700 dark:bg-zinc-800/50">
            <Icons.Server className="mb-4 h-16 w-16 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              {searchQuery || filter !== 'all'
                ? 'No services match your filters'
                : 'No services found'}
            </h3>
            <p className="mb-6 max-w-md text-center text-sm text-zinc-600 dark:text-zinc-400">
              {searchQuery || filter !== 'all' ? (
                'Try adjusting your search or filter criteria'
              ) : (
                <>
                  Run{' '}
                  <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">
                    nself init
                  </code>{' '}
                  to set up your project and start services
                </>
              )}
            </p>
            {searchQuery || filter !== 'all' ? (
              <Button
                onClick={() => {
                  setSearchQuery('')
                  setFilter('all')
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            ) : null}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedContainers.map((container) => (
              <div key={container.id} className="relative">
                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedContainers.includes(container.id)}
                    onChange={() => toggleSelectContainer(container.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800"
                  />
                </div>
                <ServiceCard
                  container={container}
                  onAction={handleContainerAction}
                  getServiceIcon={getServiceIcon}
                  getHealthColor={getHealthColor}
                  getHealthText={getHealthText}
                />
              </div>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <EnhancedListView
            containers={sortedContainers}
            onAction={handleContainerAction}
          />
        ) : (
          <TreeView
            containers={sortedContainers}
            onAction={handleContainerAction}
          />
        )}
      </DataSection>
    </PageShell>
  )
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <ServicesContent />
    </Suspense>
  )
}
