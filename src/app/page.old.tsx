'use client'

import { GridPattern } from '@/components/GridPattern'
import { HeroPattern } from '@/components/HeroPattern'
import { ensureCorrectRoute } from '@/lib/routing-logic'
import { useProjectStore } from '@/stores/projectStore'
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  type MotionValue,
} from 'framer-motion'
import {
  Activity,
  AlertCircle,
  Briefcase,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  Globe,
  Grid3x3,
  HardDrive,
  Layers,
  List,
  Mail,
  MemoryStick,
  Network,
  Play,
  Shield,
  Table2,
  Terminal,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
// DEV ONLY - REMOVE FOR PRODUCTION
import { useDevTracking } from '@/hooks/useDevTracking'

interface _SystemMetrics {
  cpu: number
  memory: { used: number; total: number; percentage: number }
  disk: { used: number; total: number; percentage: number }
  network: { rx: number; tx: number }
}

interface _DockerMetrics {
  cpu: number
  memory: { used: number; total: number; percentage: number }
  containers: number
  storage: { used: number; total: number }
  network: { rx: number; tx: number }
}

interface ServiceStatus {
  name: string
  status:
    | 'running'
    | 'stopped'
    | 'error'
    | 'healthy'
    | 'unhealthy'
    | 'restarting'
    | 'paused'
  health?: string
  uptime?: string
  cpu?: number
  memory?: number
  port?: string
  image?: string
  restartCount?: number
}

type ViewMode = 'table' | 'grid' | 'list'

interface ContainersTableProps {
  services: ServiceStatus[]
  isLoadingContainers?: boolean
}

interface ProjectInfoCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  pattern: Omit<
    React.ComponentPropsWithoutRef<typeof GridPattern>,
    'width' | 'height' | 'x'
  >
}

function ProjectInfoIcon({
  icon: Icon,
}: {
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/5 ring-1 ring-zinc-900/25 backdrop-blur-[2px] transition duration-300 group-hover:bg-white/50 group-hover:ring-zinc-900/25 dark:bg-white/7.5 dark:ring-white/15 dark:group-hover:bg-blue-400/10 dark:group-hover:ring-blue-400">
      <Icon className="h-4 w-4 stroke-zinc-700 transition-colors duration-300 group-hover:stroke-zinc-900 dark:stroke-zinc-400 dark:group-hover:stroke-blue-400" />
    </div>
  )
}

function ProjectInfoPattern({
  mouseX,
  mouseY,
  ...gridProps
}: ProjectInfoCardProps['pattern'] & {
  mouseX: MotionValue<number>
  mouseY: MotionValue<number>
}) {
  let maskImage = useMotionTemplate`radial-gradient(180px at ${mouseX}px ${mouseY}px, white, transparent)`
  let style = { maskImage, WebkitMaskImage: maskImage }

  return (
    <div className="pointer-events-none">
      <div className="absolute inset-0 rounded-2xl mask-[linear-gradient(white,transparent)] transition duration-300 group-hover:opacity-50">
        <GridPattern
          width={72}
          height={56}
          x="50%"
          className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-black/2 stroke-black/5 dark:fill-white/1 dark:stroke-white/2.5"
          {...gridProps}
        />
      </div>
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100 opacity-0 transition duration-300 group-hover:opacity-100 dark:from-blue-900/20 dark:to-blue-800/20"
        style={style}
      />
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 mix-blend-overlay transition duration-300 group-hover:opacity-100"
        style={style}
      >
        <GridPattern
          width={72}
          height={56}
          x="50%"
          className="absolute inset-x-0 inset-y-[-30%] h-[160%] w-full skew-y-[-18deg] fill-blue-400/50 stroke-blue-500/70 dark:fill-blue-400/10 dark:stroke-blue-400/30"
          {...gridProps}
        />
      </motion.div>
    </div>
  )
}

function _ProjectInfoCard({
  icon,
  label,
  value,
  pattern,
}: ProjectInfoCardProps) {
  let mouseX = useMotionValue(0)
  let mouseY = useMotionValue(0)

  function onMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) {
    let { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <div
      onMouseMove={onMouseMove}
      className="group relative flex rounded-2xl bg-zinc-50 transition-shadow hover:shadow-md hover:shadow-zinc-900/5 dark:bg-white/2.5 dark:hover:shadow-black/5"
    >
      <ProjectInfoPattern {...pattern} mouseX={mouseX} mouseY={mouseY} />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/7.5 ring-inset group-hover:ring-zinc-900/10 dark:ring-white/10 dark:group-hover:ring-white/20" />
      <div className="relative w-full rounded-2xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ProjectInfoIcon icon={icon} />
            <div className="text-sm font-semibold text-zinc-900 dark:text-white">
              {label}
            </div>
          </div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {value}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to get service category
function getServiceCategory(name: string): 'required' | 'optional' | 'user' {
  const lowerName = name.toLowerCase()

  // Required services (core stack)
  if (
    ['postgres', 'postgresql', 'database', 'db'].some((n) =>
      lowerName.includes(n),
    )
  )
    return 'required'
  if (['hasura', 'graphql'].some((n) => lowerName.includes(n)))
    return 'required'
  if (['auth', 'keycloak', 'supabase'].some((n) => lowerName.includes(n)))
    return 'required'
  if (
    ['nginx', 'proxy', 'gateway', 'traefik'].some((n) => lowerName.includes(n))
  )
    return 'required'

  // Optional services (infrastructure) - but NOT user workers
  if (lowerName.includes('bullmq') || lowerName.includes('bull')) return 'user' // BullMQ workers are custom services
  if (['minio', 's3'].some((n) => lowerName.includes(n))) return 'optional'
  if (lowerName.includes('storage') && !lowerName.includes('minio'))
    return 'optional'
  if (['mailpit'].some((n) => lowerName.includes(n))) return 'optional'
  if (['redis', 'cache', 'memcached'].some((n) => lowerName.includes(n)))
    return 'optional'
  if (
    [
      'grafana',
      'prometheus',
      'loki',
      'jaeger',
      'alertmanager',
      'monitoring',
    ].some((n) => lowerName.includes(n))
  )
    return 'optional'
  if (['kafka', 'rabbitmq', 'nats', 'amqp'].some((n) => lowerName.includes(n)))
    return 'optional'
  if (
    ['elasticsearch', 'elastic', 'kibana', 'logstash'].some((n) =>
      lowerName.includes(n),
    )
  )
    return 'optional'

  // Everything else is custom services (including workers)
  return 'user'
}

// Helper to get service order for default sorting
function getServiceDefaultOrder(
  name: string,
  category: 'required' | 'optional' | 'user',
): number {
  const lowerName = name.toLowerCase()

  if (category === 'required') {
    // Required services order
    if (lowerName.includes('postgres')) return 1
    if (lowerName.includes('hasura')) return 2
    if (lowerName.includes('auth')) return 3
    if (lowerName.includes('nginx')) return 4
    return 100
  }

  if (category === 'optional') {
    // Optional services order
    if (lowerName.includes('minio')) return 1
    if (lowerName.includes('storage') && !lowerName.includes('minio')) return 2
    if (lowerName.includes('mailpit')) return 3
    if (lowerName.includes('redis')) return 4
    if (lowerName.includes('grafana')) return 5
    if (lowerName.includes('prometheus')) return 6
    if (lowerName.includes('loki')) return 7
    if (lowerName.includes('jaeger')) return 8
    if (lowerName.includes('alertmanager')) return 9
    return 100
  }

  // User services order (alphabetical within type)
  if (lowerName.includes('nest')) return 10
  if (lowerName.includes('bull')) return 20
  if (lowerName.includes('go')) return 30
  if (lowerName.includes('py') || lowerName.includes('python')) return 40
  return 100
}

// Helper to get service sort order within optional category
function _getOptionalServiceOrder(name: string): number {
  const lowerName = name.toLowerCase()

  // Define the preferred order for optional services
  if (lowerName.includes('minio')) return 1
  if (lowerName.includes('storage') && !lowerName.includes('minio')) return 2
  if (lowerName.includes('mailpit') || lowerName.includes('mail')) return 3
  if (lowerName.includes('redis') || lowerName.includes('cache')) return 4
  if (lowerName.includes('grafana')) return 5
  if (lowerName.includes('prometheus')) return 6
  if (lowerName.includes('loki')) return 7
  if (lowerName.includes('jaeger')) return 8
  if (lowerName.includes('alertmanager')) return 9

  // Other optional services come after
  return 100
}

// Helper to get service display name
function getServiceDisplayName(name: string): string {
  const lowerName = name.toLowerCase()

  // Core services
  if (lowerName.includes('postgres')) return 'PostgreSQL'
  if (lowerName.includes('hasura')) return 'Hasura GraphQL'
  if (lowerName.includes('auth')) return 'Authentication'
  if (lowerName.includes('nginx')) return 'Nginx Proxy'

  // Storage services
  if (lowerName.includes('minio')) return 'MinIO Storage'
  if (lowerName.includes('storage') && !lowerName.includes('minio'))
    return 'Storage Volume'

  // Mail service
  if (lowerName.includes('mailpit')) return 'Mailpit'
  if (lowerName.includes('mail') && !lowerName.includes('mailpit'))
    return 'Mail Service'

  // Cache
  if (lowerName.includes('redis')) return 'Redis Cache'

  // Monitoring stack
  if (lowerName.includes('grafana')) return 'Grafana'
  if (lowerName.includes('prometheus')) return 'Prometheus'
  if (lowerName.includes('loki')) return 'Loki'
  if (lowerName.includes('jaeger')) return 'Jaeger'
  if (lowerName.includes('alertmanager')) return 'Alert Manager'

  // User services
  if (lowerName.includes('nest')) return 'NestJS API'
  if (lowerName.includes('bullmq') || lowerName.includes('bull'))
    return 'BullMQ Worker'
  if (lowerName.includes('python') || lowerName.includes('py'))
    return 'Python Service'
  if (lowerName.includes('go') && !lowerName.includes('golang'))
    return 'Go Service'

  // Other infrastructure
  if (lowerName.includes('traefik')) return 'Traefik Proxy'
  if (lowerName.includes('keycloak')) return 'Keycloak Auth'
  if (lowerName.includes('supabase')) return 'Supabase'
  if (lowerName.includes('kafka')) return 'Apache Kafka'
  if (lowerName.includes('rabbitmq')) return 'RabbitMQ'
  if (lowerName.includes('nats')) return 'NATS'
  if (lowerName.includes('elasticsearch') || lowerName.includes('elastic'))
    return 'Elasticsearch'
  if (lowerName.includes('kibana')) return 'Kibana'
  if (lowerName.includes('logstash')) return 'Logstash'

  // Clean up nself_ prefix for display
  let displayName = name.replace(/^nself[_-]/i, '')

  // Capitalize first letter of each word
  return displayName
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// ContainersTable and related components have been moved to /src/components/services_pending_code.tsx
// They will be used as the 4th view option on the Services page

interface _UnusedServiceTooltipProps {
  service: ServiceStatus
  children: React.ReactNode
}

function _UnusedServiceTooltip({
  service,
  children,
}: _UnusedServiceTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const getServiceDescription = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('postgres'))
      return 'PostgreSQL database for persistent data storage'
    if (lowerName.includes('hasura'))
      return 'GraphQL API engine for instant APIs over Postgres'
    if (lowerName.includes('auth'))
      return 'Authentication service for user management and JWT tokens'
    if (lowerName.includes('nginx'))
      return 'Web server and reverse proxy for routing requests'
    if (lowerName.includes('minio'))
      return 'S3-compatible object storage for files and media'
    if (lowerName.includes('storage'))
      return 'Storage API service for file management'
    if (lowerName.includes('mailpit'))
      return 'Email testing tool for development'
    if (lowerName.includes('redis'))
      return 'In-memory data store for caching and queues'
    if (lowerName.includes('grafana'))
      return 'Metrics visualization and monitoring dashboards'
    if (lowerName.includes('prometheus'))
      return 'Time-series database for metrics collection'
    if (lowerName.includes('loki'))
      return 'Log aggregation system for centralized logging'
    if (lowerName.includes('jaeger'))
      return 'Distributed tracing for performance monitoring'
    if (lowerName.includes('alertmanager'))
      return 'Alert routing and management for Prometheus'
    if (lowerName.includes('nest')) return 'NestJS backend service'
    if (lowerName.includes('bull'))
      return 'BullMQ worker for background job processing'
    if (lowerName.includes('python'))
      return 'Python service for data processing'
    if (lowerName.includes('go'))
      return 'Go service for high-performance operations'
    return 'Custom service'
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
      </div>
      {showTooltip && (
        <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg bg-zinc-900 p-3 text-white shadow-xl dark:bg-zinc-800">
          <div className="mb-1 font-mono text-xs text-zinc-400">
            {service.image || 'custom:latest'}
          </div>
          <div className="text-sm text-zinc-200">
            {getServiceDescription(service.name)}
          </div>
        </div>
      )}
    </div>
  )
}

interface StatusTooltipProps {
  service: ServiceStatus
  children: React.ReactNode
}

function _StatusTooltip({ service, children }: StatusTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const getHealthReason = (service: ServiceStatus) => {
    const healthStatus = getHealthStatus(service)
    if (healthStatus === 'healthy') return 'Service is running normally'
    if (healthStatus === 'unhealthy') {
      if (service.restartCount && service.restartCount > 0) {
        return `Service has restarted ${service.restartCount} times`
      }
      return 'Service health check is failing'
    }
    if (healthStatus === 'stopped') return 'Service is not running'
    return 'Service status is unknown'
  }

  const getHealthStatus = (service: ServiceStatus) => {
    if (service.health?.includes('unhealthy')) return 'unhealthy'
    if (service.health?.includes('healthy')) return 'healthy'
    if (service.status === 'running') return 'healthy'
    return service.status
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
      </div>
      {showTooltip && (
        <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-48 rounded-lg bg-zinc-900 p-2 text-sm text-white shadow-xl dark:bg-zinc-800">
          {getHealthReason(service)}
        </div>
      )}
    </div>
  )
}

function _ContainersTable({
  services,
  isLoadingContainers = false,
}: ContainersTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [sortBy, setSortBy] = useState<
    'default' | 'name' | 'status' | 'cpu' | 'memory'
  >('default')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Organize services by category
  const requiredServices = services.filter(
    (s) => getServiceCategory(s.name) === 'required',
  )
  const optionalServices = services.filter(
    (s) => getServiceCategory(s.name) === 'optional',
  )
  const userServices = services.filter(
    (s) => getServiceCategory(s.name) === 'user',
  )

  // Sort services within each category
  const sortServices = (
    serviceList: ServiceStatus[],
    category: 'required' | 'optional' | 'user',
  ) => {
    return [...serviceList].sort((a, b) => {
      switch (sortBy) {
        case 'default': {
          const orderA = getServiceDefaultOrder(a.name, category)
          const orderB = getServiceDefaultOrder(b.name, category)
          return orderA - orderB
        }
        case 'name':
          return a.name.localeCompare(b.name)
        case 'status':
          return a.status.localeCompare(b.status)
        case 'cpu':
          return (b.cpu || 0) - (a.cpu || 0)
        case 'memory':
          return (b.memory || 0) - (a.memory || 0)
        default:
          return 0
      }
    })
  }

  // Filter services
  const filterServices = (serviceList: ServiceStatus[]) => {
    return serviceList.filter((s) => {
      if (filterStatus !== 'all' && s.status !== filterStatus) return false
      if (
        searchTerm &&
        !s.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false
      return true
    })
  }

  const filteredRequired = filterServices(
    sortServices(requiredServices, 'required'),
  )
  const filteredOptional = filterServices(
    sortServices(optionalServices, 'optional'),
  )
  const filteredUser = filterServices(sortServices(userServices, 'user'))

  const getHealthStatus = (service: ServiceStatus) => {
    // Parse health status properly
    if (service.health?.includes('unhealthy')) return 'unhealthy'
    if (service.health?.includes('healthy')) return 'healthy'
    if (service.status === 'running') return 'healthy'
    return service.status
  }

  const getUptime = (health: string | undefined) => {
    if (!health) return null
    const match = health.match(/Up\s+(.+?)(?:\s+\(|$)/)
    return match ? match[1] : null
  }

  const renderServiceRow = (service: ServiceStatus, index: number) => {
    const healthStatus = getHealthStatus(service)
    const uptime = getUptime(service.health)

    return (
      <tr
        key={`${service.name}-${index}`}
        className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-950/10"
      >
        <td className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-700/50">
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-white">
              {getServiceDisplayName(service.name)}
            </div>
            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {service.name}
            </div>
          </div>
        </td>
        <td className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-700/50">
          <div>
            <div className="flex items-center">
              <div
                className={`mr-2 h-2 w-2 rounded-full ${
                  healthStatus === 'healthy'
                    ? 'bg-green-500'
                    : healthStatus === 'unhealthy'
                      ? 'bg-red-500'
                      : healthStatus === 'stopped'
                        ? 'bg-gray-500'
                        : 'bg-yellow-500'
                }`}
              />
              <span
                className={`text-sm font-medium capitalize ${
                  healthStatus === 'healthy'
                    ? 'text-green-600 dark:text-green-400'
                    : healthStatus === 'unhealthy'
                      ? 'text-red-600 dark:text-red-400'
                      : healthStatus === 'stopped'
                        ? 'text-gray-600 dark:text-gray-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                }`}
              >
                {healthStatus}
              </span>
            </div>
            {uptime && (
              <div className="mt-1 ml-4 text-xs text-zinc-500 dark:text-zinc-400">
                Up {uptime}
              </div>
            )}
          </div>
        </td>
        <td className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-700/50">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {service.cpu ? `${service.cpu.toFixed(1)}%` : '0%'}
            </span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.min(service.cpu || 0, 100)}%` }}
              />
            </div>
          </div>
        </td>
        <td className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-700/50">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {service.memory ? `${service.memory.toFixed(1)}%` : '0%'}
            </span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(service.memory || 0, 100)}%` }}
              />
            </div>
          </div>
        </td>
        <td className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-700/50">
          {service.port ? (
            <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              {service.port}
            </span>
          ) : (
            <span className="text-sm text-zinc-400 dark:text-zinc-500">-</span>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="mb-16">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Container Services
        </h2>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
            <button
              onClick={() => setViewMode('table')}
              className={`rounded p-1.5 ${viewMode === 'table' ? 'bg-white shadow-sm dark:bg-zinc-700' : ''} transition-all`}
            >
              <Table2 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-white shadow-sm dark:bg-zinc-700' : ''} transition-all`}
            >
              <List className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-white shadow-sm dark:bg-zinc-700' : ''} transition-all`}
            >
              <Grid3x3 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>

          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:focus:ring-blue-400"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:focus:ring-blue-400"
          >
            <option value="all">All Status</option>
            <option value="healthy">Healthy</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="unhealthy">Unhealthy</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:focus:ring-blue-400"
          >
            <option value="default">Sort by Default</option>
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Status</option>
            <option value="cpu">Sort by CPU</option>
            <option value="memory">Sort by Memory</option>
          </select>
        </div>
      </div>

      <div className="not-prose overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900/50 dark:ring-zinc-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Service / Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Status / Uptime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  CPU Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Memory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Port
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900/30">
              {/* Required Services */}
              {filteredRequired.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={5}
                      className="border-b border-zinc-200/50 px-6 py-2 dark:border-zinc-700/30"
                    >
                      <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                        Required Services
                      </span>
                    </td>
                  </tr>
                  {filteredRequired.map((service, index) =>
                    renderServiceRow(service, index),
                  )}
                </>
              )}

              {/* Optional Services */}
              {filteredOptional.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={5}
                      className="border-b border-zinc-200/50 px-6 py-2 dark:border-zinc-700/30"
                    >
                      <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                        Optional Services
                      </span>
                    </td>
                  </tr>
                  {filteredOptional.map((service, index) =>
                    renderServiceRow(service, index),
                  )}
                </>
              )}

              {/* Custom Services */}
              {filteredUser.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={5}
                      className="border-b border-zinc-200/50 px-6 py-2 dark:border-zinc-700/30"
                    >
                      <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                        Custom Services
                      </span>
                    </td>
                  </tr>
                  {filteredUser.map((service, index) =>
                    renderServiceRow(service, index),
                  )}
                </>
              )}

              {services.length === 0 && !isLoadingContainers && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    No containers found. Start your nself services to see them
                    here.
                  </td>
                </tr>
              )}
              {services.length === 0 && isLoadingContainers && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      Loading services...
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function getCategoryColors(category: 'required' | 'optional' | 'user') {
  switch (category) {
    case 'required':
      return {
        icon: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
      }
    case 'optional':
      return {
        icon: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-100 dark:bg-purple-900/30',
      }
    case 'user':
      return {
        icon: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-100 dark:bg-orange-900/30',
      }
    default:
      return {
        icon: 'text-zinc-600 dark:text-zinc-400',
        bg: 'bg-zinc-100 dark:bg-zinc-900/30',
      }
  }
}

interface BackendServiceCardProps {
  title: string
  services: ServiceStatus[]
  icon: React.ComponentType<{ className?: string }>
  description: string
  color: 'blue' | 'emerald' | 'purple' | 'red' | 'orange' | 'violet'
  category?: 'required' | 'optional' | 'user'
  isLoading?: boolean
}

function BackendServiceCard({
  title,
  services,
  icon: Icon,
  description,
  color,
  category,
  isLoading = false,
}: BackendServiceCardProps) {
  const [expanded, setExpanded] = useState(false)

  // Sort services based on title
  const sortedServices = [...services].sort((a, b) => {
    if (title === 'Monitoring') {
      // Custom sort for monitoring stack
      const order = [
        'prometheus',
        'grafana',
        'loki',
        'tempo',
        'alertmanager',
        'cadvisor',
        'postgres_exporter',
        'node_exporter',
      ]

      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()

      // Find positions in order array
      const aIndex = order.findIndex((item) => aName.includes(item))
      const bIndex = order.findIndex((item) => bName.includes(item))

      // If both found in order, sort by order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }

      // If only one found, put it first
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1

      // Otherwise sort alphabetically
      return aName.localeCompare(bName)
    } else if (title === 'API Gateway') {
      // Custom sort: Hasura first, then Nginx, then others
      const aName = a.name.toLowerCase()
      const bName = b.name.toLowerCase()
      if (aName.includes('hasura')) return -1
      if (bName.includes('hasura')) return 1
      if (aName.includes('nginx')) return -1
      if (bName.includes('nginx')) return 1
      return aName.localeCompare(bName)
    }

    // Default alphabetical sort for other categories
    return a.name.localeCompare(b.name)
  })

  const runningCount = sortedServices.filter(
    (s) =>
      s.status === 'healthy' ||
      s.status === 'running' ||
      s.status === 'restarting',
  ).length
  const totalCount = sortedServices.length
  const isHealthy = runningCount === totalCount && totalCount > 0
  const categoryColors = category ? getCategoryColors(category) : null

  const colorClasses = {
    blue: {
      bg: 'hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
      ring: 'group-hover:ring-blue-500/20 dark:group-hover:ring-blue-400/30',
      icon: 'bg-blue-500/10 dark:bg-blue-400/10 group-hover:bg-blue-500/20 dark:group-hover:bg-blue-400/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      status: isHealthy
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-red-600 dark:text-red-400',
    },
    emerald: {
      bg: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
      ring: 'group-hover:ring-emerald-500/20 dark:group-hover:ring-emerald-400/30',
      icon: 'bg-emerald-500/10 dark:bg-emerald-400/10 group-hover:bg-emerald-500/20 dark:group-hover:bg-emerald-400/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      status: isHealthy
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400',
    },
    purple: {
      bg: 'hover:bg-purple-50/50 dark:hover:bg-purple-950/20',
      ring: 'group-hover:ring-purple-500/20 dark:group-hover:ring-purple-400/30',
      icon: 'bg-purple-500/10 dark:bg-purple-400/10 group-hover:bg-purple-500/20 dark:group-hover:bg-purple-400/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      status: isHealthy
        ? 'text-purple-600 dark:text-purple-400'
        : 'text-red-600 dark:text-red-400',
    },
    red: {
      bg: 'hover:bg-red-50/50 dark:hover:bg-red-950/20',
      ring: 'group-hover:ring-red-500/20 dark:group-hover:ring-red-400/30',
      icon: 'bg-red-500/10 dark:bg-red-400/10 group-hover:bg-red-500/20 dark:group-hover:bg-red-400/20',
      iconColor: 'text-red-600 dark:text-red-400',
      status: isHealthy
        ? 'text-red-600 dark:text-red-400'
        : 'text-red-600 dark:text-red-400',
    },
    orange: {
      bg: 'hover:bg-orange-50/50 dark:hover:bg-orange-950/20',
      ring: 'group-hover:ring-orange-500/20 dark:group-hover:ring-orange-400/30',
      icon: 'bg-orange-500/10 dark:bg-orange-400/10 group-hover:bg-orange-500/20 dark:group-hover:bg-orange-400/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      status: isHealthy
        ? 'text-orange-600 dark:text-orange-400'
        : 'text-red-600 dark:text-red-400',
    },
    violet: {
      bg: 'hover:bg-violet-50/50 dark:hover:bg-violet-950/20',
      ring: 'group-hover:ring-violet-500/20 dark:group-hover:ring-violet-400/30',
      icon: 'bg-violet-500/10 dark:bg-violet-400/10 group-hover:bg-violet-500/20 dark:group-hover:bg-violet-400/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
      status: isHealthy
        ? 'text-violet-600 dark:text-violet-400'
        : 'text-red-600 dark:text-red-400',
    },
  }

  const classes = colorClasses[color]

  return (
    <div
      className={`group relative rounded-2xl bg-zinc-50 p-6 transition-colors duration-300 dark:bg-white/2.5 ${classes.bg}`}
    >
      <div
        className={`absolute inset-0 rounded-2xl ring-1 ring-zinc-900/7.5 transition-colors duration-300 ring-inset dark:ring-white/10 ${classes.ring}`}
      />

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300 ${
              category && categoryColors ? `${categoryColors.bg}` : classes.icon
            }`}
          >
            <Icon
              className={`h-4 w-4 ${
                category && categoryColors
                  ? categoryColors.icon
                  : classes.iconColor
              }`}
            />
          </div>
          <div
            className={`text-lg font-bold ${
              totalCount === 0
                ? 'text-gray-400'
                : runningCount === totalCount
                  ? 'text-blue-600 dark:text-blue-400'
                  : runningCount === 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {totalCount > 0 ? `${runningCount}/${totalCount}` : '0'}
          </div>
        </div>

        <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
          {title}
        </h3>

        <p className="mb-4 text-xs text-zinc-600 dark:text-zinc-400">
          {description}
        </p>

        {sortedServices.length > 0 && (
          <div className="space-y-1">
            {sortedServices
              .slice(0, expanded ? sortedServices.length : 3)
              .map((service, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate text-zinc-700 dark:text-zinc-300">
                    {service.name}
                  </span>
                  <div className="flex items-center">
                    <div
                      className={`mr-1 h-1.5 w-1.5 rounded-full ${
                        service.status === 'healthy' ||
                        service.status === 'running'
                          ? 'bg-green-500'
                          : service.status === 'error' ||
                              service.status === 'unhealthy'
                            ? 'bg-red-500'
                            : service.status === 'restarting'
                              ? 'bg-amber-500'
                              : service.status === 'paused'
                                ? 'bg-blue-500'
                                : 'bg-gray-500'
                      }`}
                    />
                    <span
                      className={`text-xs capitalize ${
                        service.status === 'error' ||
                        service.status === 'unhealthy'
                          ? 'font-medium text-red-500 dark:text-red-400'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {service.status === 'healthy'
                        ? 'up'
                        : service.status === 'error'
                          ? 'error'
                          : service.status === 'restarting'
                            ? 'restarting'
                            : service.status}
                    </span>
                  </div>
                </div>
              ))}
            {sortedServices.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                {expanded ? 'Show less' : `+${sortedServices.length - 3} more`}
              </button>
            )}
          </div>
        )}

        {sortedServices.length === 0 && !isLoading && (
          <div className="text-xs text-zinc-500 italic dark:text-zinc-400">
            {title === 'Applications'
              ? 'No apps configured yet'
              : 'No services detected'}
          </div>
        )}

        {sortedServices.length === 0 && isLoading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            Loading...
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  // DEV TRACKING - REMOVE FOR PRODUCTION
  const {
    logEvent: _logEvent,
    startTimer: _startTimer,
    endTimer: _endTimer,
  } = useDevTracking('DashboardPage')

  // Show loading state immediately while data loads
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Use cached data from global store
  const systemMetrics = useProjectStore((state) => state.systemMetrics)
  const containerStats = useProjectStore((state) => state.containerStats)
  const isLoadingMetrics = useProjectStore((state) => state.isLoadingMetrics)
  const isLoadingContainers = useProjectStore(
    (state) => state.isLoadingContainers,
  )
  const _lastDataUpdate = useProjectStore((state) => state.lastDataUpdate)
  const fetchAllData = useProjectStore((state) => state.fetchAllData)
  const projectStatus = useProjectStore((state) => state.projectStatus)
  const containersRunning = useProjectStore((state) => state.containersRunning)
  const checkProjectStatus = useProjectStore(
    (state) => state.checkProjectStatus,
  )

  // Project info for name prefix stripping
  const [projectInfo, setProjectInfo] = useState<{
    projectName?: string
    [key: string]: unknown
  } | null>(null)

  // Mark initial load complete after first render
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 100)
    return () => clearTimeout(timer)
  }, [])

  // Check routing and load dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      // Safety check: ensure we should be on the dashboard
      const redirected = await ensureCorrectRoute('/', router.push)
      if (redirected) {
        return // Don't load data if we're redirecting
      }

      // Immediately fetch data since we're on the dashboard
      // This ensures we get container data quickly to prevent flickering
      fetchAllData()

      // Then update project status in parallel (don't wait for it)
      checkProjectStatus()

      // Check if services were recently started (within last 30 seconds)
      const recentlyStarted = localStorage.getItem('services_recently_started')
      const isRecent =
        recentlyStarted && Date.now() - parseInt(recentlyStarted) < 30000

      // If recently started, check again in a few seconds for updated data
      if (isRecent) {
        setTimeout(() => {
          checkProjectStatus()
          fetchAllData()
        }, 3000)
      }
    }

    initializeDashboard()
  }, [checkProjectStatus, fetchAllData, router.push])

  // Add real-time polling for live dashboard updates
  useEffect(() => {
    // Start background refresh for real-time updates
    const interval = setInterval(() => {
      if (!isInitialLoad) {
        fetchAllData()
      }
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [isInitialLoad, fetchAllData])

  // Helper to clean service names (remove project prefix)
  const cleanServiceName = (name: string): string => {
    // Get project name from projectInfo (e.g., "nself-web" -> "web")
    const projectName = projectInfo?.projectName
    if (projectName) {
      // Extract the short name (e.g., "nself-web" -> "web", "my-project" -> "my-project")
      const shortName = projectName.replace(/^nself-/, '')
      // Remove project prefix pattern (e.g., "web_postgres" -> "postgres")
      const projectPrefixPattern = new RegExp(`^${shortName}[_-]`, 'i')
      name = name.replace(projectPrefixPattern, '')
    }
    // Also remove common nself prefixes like nproj99_ or nself_
    return name.replace(/^(nproj\d+_|nself_|nself-)/, '')
  }

  // Transform container stats to services format
  const services: ServiceStatus[] = containerStats.map((c: any) => {
    // Determine status based on health and state
    let status: ServiceStatus['status']
    if (c.health === 'healthy' || (c.state === 'running' && !c.health)) {
      status = 'healthy'
    } else if (
      c.health === 'unhealthy' ||
      c.state === 'exited' ||
      c.state === 'dead'
    ) {
      status = 'error'
    } else if (c.health === 'restarting' || c.state === 'restarting') {
      status = 'restarting'
    } else if (c.state === 'paused') {
      status = 'paused'
    } else {
      status = 'stopped'
    }

    return {
      name: cleanServiceName(c.name || 'unknown'),
      status,
      health: c.health || c.state,
      cpu: c.stats?.cpu?.percentage || 0,
      memory: c.stats?.memory?.percentage || 0,
      port: c.ports?.[0]?.public,
    }
  })

  // Use Docker metrics from system metrics API if available
  const apiDockerMetrics = systemMetrics?.docker

  // Debug: Log the metrics to see if they're updating
  useEffect(() => {
    // Metrics debug logging removed
  }, [systemMetrics])

  // Calculate Docker metrics from container stats as fallback
  const dockerMemoryUsed = containerStats.reduce((total, c) => {
    return total + (c.stats?.memory?.usage || 0)
  }, 0)

  const dockerMemoryLimit = containerStats.reduce((total, c) => {
    return total + (c.stats?.memory?.limit || 0)
  }, 0)

  // Derive docker metrics - prefer API data, fallback to calculated
  const _dockerMetrics = apiDockerMetrics
    ? {
        ...apiDockerMetrics,
        cpu:
          typeof apiDockerMetrics.cpu === 'number'
            ? apiDockerMetrics.cpu
            : (apiDockerMetrics.cpu as any)?.usage || 0,
        containers: apiDockerMetrics.containers || {
          total: containerStats.length,
          running: containerStats.filter((c) => c.state === 'running').length,
          stopped: containerStats.filter((c) => c.state !== 'running').length,
          healthy: containerStats.filter((c) => c.health === 'healthy').length,
        },
      }
    : {
        containers: {
          total: containerStats.length,
          running: containerStats.filter((c) => c.state === 'running').length,
          stopped: containerStats.filter((c) => c.state !== 'running').length,
          healthy: containerStats.filter((c) => c.health === 'healthy').length,
        },
        memory: {
          used: Math.round((dockerMemoryUsed / 1024 / 1024 / 1024) * 10) / 10, // Convert to GB
          total: Math.round((dockerMemoryLimit / 1024 / 1024 / 1024) * 10) / 10,
        },
        cpu: containerStats.reduce(
          (total, c) => total + (c.stats?.cpu?.percentage || 0),
          0,
        ),
        storage: {
          used: 0,
          total: 50, // Default 50GB for Docker
        },
        network: {
          rx: 0,
          tx: 0,
        },
      }

  // Use loading state only for initial load when we have no data at all
  const _loading =
    !systemMetrics &&
    !containerStats.length &&
    !projectStatus &&
    (isLoadingMetrics || isLoadingContainers)
  const _refreshing = isLoadingMetrics || isLoadingContainers

  // Manual refresh function
  const _handleRefresh = async () => {
    await fetchAllData()
  }

  const _runningServices = services.filter(
    (s) => s.status === 'healthy' || s.status === 'running',
  ).length
  const _totalServices = services.length
  // Check both project status and actual services
  const _hasRunningServices =
    projectStatus === 'running' || containersRunning > 0 || _runningServices > 0

  const [_starting, setStarting] = useState(false)
  const [_startProgress, setStartProgress] = useState<{
    message: string
    percentage?: number
    type?:
      | 'status'
      | 'progress'
      | 'download'
      | 'container'
      | 'error'
      | 'complete'
  }>({ message: '' })

  // Frontend apps from config
  const [frontendApps, setFrontendApps] = useState<any[]>([])
  const [loadingApps, setLoadingApps] = useState(false)

  // Mouse tracking for cards
  function MetricCard({
    title,
    value,
    percentage,
    description,
    icon: Icon,
  }: {
    title: string
    value: string | number
    percentage?: number
    description: string
    icon: React.ComponentType<{ className?: string }>
  }) {
    let mouseX = useMotionValue(0)
    let mouseY = useMotionValue(0)

    function onMouseMove({
      currentTarget,
      clientX,
      clientY,
    }: React.MouseEvent<HTMLDivElement>) {
      let { left, top } = currentTarget.getBoundingClientRect()
      mouseX.set(clientX - left)
      mouseY.set(clientY - top)
    }

    return (
      <div
        onMouseMove={onMouseMove}
        className="group relative rounded-2xl bg-zinc-50/90 p-6 transition-colors duration-300 hover:bg-blue-50/80 dark:bg-white/5 dark:hover:bg-blue-950/40"
      >
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-200 to-blue-100 opacity-0 transition duration-300 group-hover:opacity-100 dark:from-blue-500/40 dark:to-blue-400/30"
          style={{
            maskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
            WebkitMaskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
          }}
        />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/10 transition-colors duration-300 ring-inset group-hover:ring-blue-500/50 dark:ring-white/20 dark:group-hover:ring-blue-400/60" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {title}
            </h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 transition-colors duration-300 group-hover:bg-blue-500/40 dark:bg-blue-400/20 dark:group-hover:bg-blue-400/40">
              <Icon className="h-4 w-4 text-blue-600 group-hover:text-blue-500 dark:text-blue-400 dark:group-hover:text-blue-300" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {value}
            </div>
            {percentage !== undefined && (
              <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            )}
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        </div>
      </div>
    )
  }

  // Docker polling service handles all data fetching centrally
  // Dashboard just reads from the store - no fetching needed here
  // The polling service updates the store every 1 second automatically

  // Always fetch project info for project name (needed for prefix stripping)
  useEffect(() => {
    fetchProjectInfo()
  }, [])

  // Fetch frontend apps from config
  useEffect(() => {
    fetchFrontendApps()
  }, [])

  const fetchFrontendApps = async () => {
    setLoadingApps(true)
    try {
      const res = await fetch('/api/config/frontend-apps')
      const data = await res.json()
      if (data.success) {
        setFrontendApps(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch frontend apps:', error)
    } finally {
      setLoadingApps(false)
    }
  }

  const fetchProjectInfo = async () => {
    try {
      const res = await fetch('/api/project/info')
      const data = await res.json()
      if (data.success) {
        setProjectInfo(data.data)
      }
    } catch (error) {
      console.warn('[Dashboard] Error fetching project info:', error)
    }
  }

  const _startServices = async () => {
    try {
      setStarting(true)
      setStartProgress({
        message: 'Initializing Docker services...',
        type: 'status',
      })

      // Use streaming API for real-time progress
      const response = await fetch('/api/nself/start-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to start services')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value)
          const lines = text.split('\n').filter((line) => line.trim())

          for (const line of lines) {
            try {
              const data = JSON.parse(line)

              switch (data.type) {
                case 'status':
                case 'progress':
                  setStartProgress({
                    message: data.message,
                    percentage: data.percentage,
                    type: data.type,
                  })
                  break

                case 'download':
                  setStartProgress({
                    message: data.message,
                    percentage: data.percentage,
                    type: 'download',
                  })
                  break

                case 'container':
                  setStartProgress({
                    message: data.message,
                    type: 'container',
                  })
                  break

                case 'error':
                  setStartProgress({
                    message: `Error: ${data.message}`,
                    type: 'error',
                  })
                  console.error('Start error:', data.message)
                  break

                case 'complete':
                  setStartProgress({
                    message: data.message,
                    percentage: 100,
                    type: 'complete',
                  })
                  // Refresh status after completion
                  setTimeout(() => {
                    checkProjectStatus()
                    fetchAllData()
                  }, 2000)
                  break
              }
            } catch (err) {
              console.error('Failed to parse stream data:', err)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to start services:', error)
      setStartProgress({
        message: 'Failed to start services. Please check Docker is running.',
        type: 'error',
      })
    } finally {
      // Keep showing the final message for a bit before clearing
      setTimeout(() => {
        setStarting(false)
        setStartProgress({ message: '' })
      }, 5000)
    }
  }

  // Show content immediately with loading states
  const _showLoadingState =
    isInitialLoad || (!systemMetrics && !containerStats.length)
  // Fix flickering: Use multiple signals to determine if services should be shown
  // Check containerStats directly (most reliable), then containersRunning, then projectStatus
  const showServices =
    containerStats.length > 0 ||
    containersRunning > 0 ||
    projectStatus === 'running'

  return (
    <>
      <HeroPattern />

      {/* Hero Section */}
      <div className="mt-12 mb-4">
        <h1 className="bg-gradient-to-r from-blue-600 to-black bg-clip-text text-4xl/tight font-extrabold text-transparent sm:text-6xl/tight dark:from-blue-400 dark:to-white">
          Dashboard
        </h1>
      </div>

      {/* Services Dashboard - only shown when services are running */}
      {showServices && (
        <>
          {/* System Overview Cards */}
          <div className="mb-16">
            <div className="not-prose grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
              {/* Docker CPU Usage - Direct from systemMetrics */}
              <MetricCard
                title="CPU Usage"
                value={`${Math.round(systemMetrics?.docker?.cpu || 0)}%`}
                percentage={Math.min(systemMetrics?.docker?.cpu || 0, 100)}
                description={`System: ${Math.round(systemMetrics?.system?.cpu || 0)}%`}
                icon={Cpu}
              />

              {/* Docker Memory Usage - Direct from systemMetrics */}
              <MetricCard
                title="Memory Usage"
                value={`${Math.round(systemMetrics?.docker?.memory?.percentage || 0)}%`}
                percentage={systemMetrics?.docker?.memory?.percentage || 0}
                description={`${systemMetrics?.docker?.memory?.used || 0}GB / ${systemMetrics?.docker?.memory?.total || 0}GB`}
                icon={MemoryStick}
              />

              {/* Docker Storage - Direct from systemMetrics */}
              <MetricCard
                title="Storage Usage"
                value={`${Math.round(((systemMetrics?.docker?.storage?.used || 0) / (systemMetrics?.docker?.storage?.total || 1)) * 100)}%`}
                percentage={Math.round(
                  ((systemMetrics?.docker?.storage?.used || 0) /
                    (systemMetrics?.docker?.storage?.total || 1)) *
                    100,
                )}
                description={`${systemMetrics?.docker?.storage?.used || 0}GB / ${systemMetrics?.docker?.storage?.total || 50}GB`}
                icon={HardDrive}
              />

              {/* Docker Network */}
              <MetricCard
                title="Network Traffic"
                value={`${((systemMetrics?.system?.network?.rx || 0) + (systemMetrics?.system?.network?.tx || 0)).toFixed(2)} Mbps`}
                percentage={Math.min(
                  (((systemMetrics?.system?.network?.rx || 0) +
                    (systemMetrics?.system?.network?.tx || 0)) /
                    (systemMetrics?.system?.network?.maxSpeed || 1000)) *
                    100,
                  100,
                )}
                description={`${systemMetrics?.system?.network?.maxSpeed || 1000} Mbps max`}
                icon={Network}
              />
            </div>
          </div>

          {/* Container Status Overview */}
          <div className="mb-16">
            <h2 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-white">
              Container Status
            </h2>
            <div className="not-prose grid grid-cols-2 gap-8 sm:grid-cols-4">
              {/* Running Containers */}
              <div className="group relative rounded-2xl bg-zinc-50 p-6 transition-colors duration-300 hover:bg-green-50/50 dark:bg-white/2.5 dark:hover:bg-green-950/20">
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Running
                    </h3>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 transition-colors duration-300 group-hover:bg-green-500/20 dark:bg-green-400/10 dark:group-hover:bg-green-400/20">
                      <Play className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {
                        services.filter(
                          (s) =>
                            s.status === 'healthy' || s.status === 'running',
                        ).length
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Healthy Containers */}
              <div className="group relative rounded-2xl bg-zinc-50 p-6 transition-colors duration-300 hover:bg-blue-50/50 dark:bg-white/2.5 dark:hover:bg-blue-950/20">
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Healthy
                    </h3>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 transition-colors duration-300 group-hover:bg-blue-500/20 dark:bg-blue-400/10 dark:group-hover:bg-blue-400/20">
                      <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {services.filter((s) => s.status === 'healthy').length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stopped Containers */}
              <div className="group relative rounded-2xl bg-zinc-50 p-6 transition-colors duration-300 hover:bg-zinc-100/50 dark:bg-white/2.5 dark:hover:bg-zinc-800/20">
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Stopped
                    </h3>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-500/10 transition-colors duration-300 group-hover:bg-zinc-500/20 dark:bg-zinc-400/10 dark:group-hover:bg-zinc-400/20">
                      <Clock className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {services.filter((s) => s.status === 'stopped').length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Containers */}
              <div className="group relative rounded-2xl bg-zinc-50 p-6 transition-colors duration-300 hover:bg-red-50/50 dark:bg-white/2.5 dark:hover:bg-red-950/20">
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Error
                    </h3>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 transition-colors duration-300 group-hover:bg-red-500/20 dark:bg-red-400/10 dark:group-hover:bg-red-400/20">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {
                        services.filter(
                          (s) =>
                            s.status === 'error' || s.status === 'unhealthy',
                        ).length
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Backend Stack Overview */}
          <div className="-mt-8 mb-16">
            <div className="not-prose grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Row 1 - Core Infrastructure */}
              {/* Database Services */}
              <BackendServiceCard
                title="Database Services"
                services={services.filter((s) => {
                  const name = s.name.toLowerCase()
                  // Include postgres and redis, but exclude exporters (those go in monitoring)
                  return (
                    [
                      'postgres',
                      'postgresql',
                      'database',
                      'db',
                      'redis',
                      'cache',
                      'memcached',
                    ].some((n) => name.includes(n)) &&
                    !name.includes('exporter')
                  )
                })}
                icon={Database}
                description="PostgreSQL, Redis & caching layer"
                color="blue"
                category="required"
                isLoading={isLoadingContainers}
              />

              {/* API Gateway */}
              <BackendServiceCard
                title="API Gateway"
                services={services
                  .filter((s) => {
                    const name = s.name.toLowerCase()
                    // Only match actual gateway/proxy services
                    // Exclude user services that happen to have 'api' in the name (e.g., ping_api)
                    const isGatewayService = [
                      'hasura',
                      'graphql',
                      'nginx',
                      'gateway',
                      'proxy',
                      'traefik',
                      'kong',
                      'envoy',
                    ].some((gw) => name.includes(gw))

                    // Exclude backend frameworks
                    const isBackendFramework = [
                      'nest',
                      'fastapi',
                      'go',
                      'python',
                    ].some((exclude) => name.includes(exclude))

                    return isGatewayService && !isBackendFramework
                  })
                  .sort((a, b) => {
                    // Custom sort: Hasura first, then Nginx, then others
                    const aName = a.name.toLowerCase()
                    const bName = b.name.toLowerCase()
                    if (aName.includes('hasura')) return -1
                    if (bName.includes('hasura')) return 1
                    if (aName.includes('nginx')) return -1
                    if (bName.includes('nginx')) return 1
                    return aName.localeCompare(bName)
                  })}
                icon={Globe}
                description="Nginx, Hasura GraphQL & REST APIs"
                color="blue"
                category="required"
                isLoading={isLoadingContainers}
              />

              {/* Authentication */}
              <BackendServiceCard
                title="Authentication"
                services={services.filter((s) =>
                  ['auth', 'jwt', 'oauth', 'keycloak', 'supabase'].some(
                    (name) =>
                      s.name.toLowerCase().includes(name) &&
                      !['alertmanager'].some((exclude) =>
                        s.name.toLowerCase().includes(exclude),
                      ),
                  ),
                )}
                icon={Shield}
                description="Auth service, JWT & session management"
                color="blue"
                category="required"
                isLoading={isLoadingContainers}
              />

              {/* Row 2 - Platform Services */}
              {/* Storage */}
              <BackendServiceCard
                title="Storage"
                services={services.filter((s) =>
                  ['minio', 's3', 'storage', 'file', 'blob'].some((name) =>
                    s.name.toLowerCase().includes(name),
                  ),
                )}
                icon={HardDrive}
                description="MinIO object storage & file management"
                color="violet"
                category="optional"
                isLoading={isLoadingContainers}
              />

              {/* Mail & Search */}
              <BackendServiceCard
                title="Mail & Search"
                services={services.filter((s) =>
                  [
                    'meili',
                    'meilisearch',
                    'elastic',
                    'elasticsearch',
                    'search',
                    'mailpit',
                    'mail',
                    'smtp',
                    'email',
                  ].some(
                    (name) =>
                      s.name.toLowerCase().includes(name) &&
                      !['bull'].some((exclude) =>
                        s.name.toLowerCase().includes(exclude),
                      ),
                  ),
                )}
                icon={Mail}
                description="MeiliSearch, Mailpit & email services"
                color="violet"
                category="optional"
                isLoading={isLoadingContainers}
              />

              {/* Monitoring */}
              <BackendServiceCard
                title="Monitoring"
                services={services.filter((s) =>
                  [
                    'prometheus',
                    'grafana',
                    'loki',
                    'tempo',
                    'jaeger',
                    'alertmanager',
                    'cadvisor',
                    'exporter',
                    'monitoring',
                    'metrics',
                  ].some((name) => s.name.toLowerCase().includes(name)),
                )}
                icon={Activity}
                description="Prometheus, Grafana, Loki & tracing"
                color="violet"
                category="optional"
                isLoading={isLoadingContainers}
              />

              {/* Row 3 - User Applications */}
              {/* Workers & Jobs */}
              <BackendServiceCard
                title="Workers & Jobs"
                services={services.filter((s) => {
                  const name = s.name.toLowerCase()
                  // BullMQ workers, Celery workers, MLflow, or any container with "worker" in the name
                  return (
                    name.includes('bullmq') ||
                    name.includes('bull') ||
                    name.includes('worker') ||
                    name.includes('celery') ||
                    name.includes('mlflow')
                  )
                })}
                icon={Briefcase}
                description="Background jobs & ML pipelines"
                color="orange"
                category="user"
                isLoading={isLoadingContainers}
              />

              {/* Services */}
              <BackendServiceCard
                title="Services"
                services={services.filter((s) => {
                  const name = s.name.toLowerCase()

                  // Framework services (NestJS, Go, Python)
                  const isFrameworkService = [
                    'nest',
                    'go',
                    'golang',
                    'python',
                    'py',
                  ].some((n) => name.includes(n))

                  // Generic user services (service_X pattern or *_api pattern)
                  const isGenericService =
                    /service_\d+/.test(name) ||
                    /_api$/.test(name) ||
                    /^api_/.test(name)

                  // Custom user services that contain 'api' but aren't gateways
                  const isCustomApiService =
                    name.includes('api') &&
                    ![
                      'hasura',
                      'graphql',
                      'nginx',
                      'gateway',
                      'proxy',
                      'traefik',
                      'kong',
                      'envoy',
                    ].some((gw) => name.includes(gw))

                  const isNotWorker =
                    !name.includes('bull') && !name.includes('mlflow')

                  return (
                    (isFrameworkService ||
                      isGenericService ||
                      isCustomApiService) &&
                    isNotWorker
                  )
                })}
                icon={Terminal}
                description="Custom APIs & microservices"
                color="orange"
                category="user"
                isLoading={isLoadingContainers}
              />

              {/* Applications */}
              <BackendServiceCard
                title="Applications"
                services={[
                  // Docker-based frontend containers
                  ...services.filter((s) => {
                    const name = s.name.toLowerCase()
                    return [
                      'frontend',
                      'webapp',
                      'mobile',
                      'client-app',
                      'ui-app',
                    ].some(
                      (n) =>
                        name === n ||
                        name.startsWith(n + '-') ||
                        name.endsWith('-' + n),
                    )
                  }),
                  // Config-based frontend apps
                  ...frontendApps.map((app) => ({
                    name: app.displayName,
                    status: 'healthy' as any, // Config apps are considered configured/healthy
                    health: app.status,
                    cpu: 0,
                    memory: 0,
                    port: app.port,
                  })),
                ]}
                icon={Layers}
                description="Frontend & client applications"
                color="orange"
                category="user"
                isLoading={isLoadingContainers || loadingApps}
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}
