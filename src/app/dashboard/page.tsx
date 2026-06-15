'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { DashboardSkeleton } from '@/components/skeletons'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  Globe,
  HardDrive,
  MemoryStick,
  Network,
  Play,
  Shield,
  Zap,
} from 'lucide-react'
import { Suspense, useEffect } from 'react'

// Import from central data store
import { getDataCollectionService } from '@/services/DataCollectionService'
import {
  useAlerts,
  useCentralDataStore,
  useConnectionStatus,
  useContainers,
  useDockerMetrics,
  useServicesHealth,
  useSystemMetrics,
} from '@/stores/centralDataStore'

function MetricCard({
  title,
  value,
  percentage,
  description,
  icon: Icon,
  trend: _trend,
}: {
  title: string
  value: string | number
  percentage?: number
  description: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'stable'
}) {
  let mouseX = useMotionValue(0)
  let mouseY = useMotionValue(0)

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) {
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
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 transition-colors duration-300 group-hover:bg-blue-500/40 dark:bg-blue-400/20 dark:group-hover:bg-blue-400/40">
            <Icon className="h-4 w-4 text-blue-600 group-hover:text-blue-500 dark:text-blue-400 dark:group-hover:text-blue-300" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</div>
          {percentage !== undefined && (
            <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          )}
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>
    </div>
  )
}

function StatusCard({
  title,
  count,
  icon: Icon,
  color,
}: {
  title: string
  count: number
  icon: React.ComponentType<{ className?: string }>
  color: 'green' | 'blue' | 'yellow' | 'red' | 'gray'
}) {
  const colorClasses = {
    green:
      'bg-green-500/10 dark:bg-green-400/10 group-hover:bg-green-500/20 dark:group-hover:bg-green-400/20',
    blue: 'bg-blue-500/10 dark:bg-blue-400/10 group-hover:bg-blue-500/20 dark:group-hover:bg-blue-400/20',
    yellow:
      'bg-yellow-500/10 dark:bg-yellow-400/10 group-hover:bg-yellow-500/20 dark:group-hover:bg-yellow-400/20',
    red: 'bg-red-500/10 dark:bg-red-400/10 group-hover:bg-red-500/20 dark:group-hover:bg-red-400/20',
    gray: 'bg-zinc-500/10 dark:bg-zinc-400/10 group-hover:bg-zinc-500/20 dark:group-hover:bg-zinc-400/20',
  }

  const iconColors = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
    gray: 'text-zinc-600 dark:text-zinc-400',
  }

  return (
    <div className="group relative rounded-2xl bg-zinc-50 p-6 transition-colors duration-300 hover:bg-zinc-100/50 dark:bg-white/2.5 dark:hover:bg-zinc-800/20">
      <div className="relative">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300 ${colorClasses[color]}`}
          >
            <Icon className={`h-4 w-4 ${iconColors[color]}`} />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{count}</div>
        </div>
      </div>
    </div>
  )
}

function ServiceCard({
  name,
  status,
  icon: Icon,
  description,
  metrics,
}: {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded' | 'stopped'
  icon: React.ComponentType<{ className?: string }>
  description: string
  metrics?: { label: string; value: string | number }[]
}) {
  const statusColors = {
    healthy: 'text-green-600 dark:text-green-400',
    unhealthy: 'text-red-600 dark:text-red-400',
    degraded: 'text-yellow-600 dark:text-yellow-400',
    stopped: 'text-zinc-500 dark:text-zinc-400',
  }

  return (
    <div className="group relative rounded-2xl bg-zinc-50 p-6 dark:bg-white/2.5">
      <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/7.5 ring-inset dark:ring-white/10" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 dark:bg-blue-400/10">
            <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className={`text-sm font-medium ${statusColors[status]}`}>{status}</span>
        </div>

        <h3 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-white">{name}</h3>

        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>

        {metrics && metrics.length > 0 && (
          <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            {metrics.map((metric, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">{metric.label}</span>
                <span className="font-medium text-zinc-900 dark:text-white">{metric.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DashboardContent() {
  // Get data from central store
  const docker = useDockerMetrics()
  const system = useSystemMetrics()
  const containers = useContainers()
  const servicesHealth = useServicesHealth()
  const alerts = useAlerts()
  const { isConnected, error } = useConnectionStatus()

  // Performance metrics from store
  const { apiCallsCount, cacheHits, cacheMisses } = useCentralDataStore((state) => ({
    apiCallsCount: state.apiCallsCount,
    cacheHits: state.cacheHits,
    cacheMisses: state.cacheMisses,
  }))

  // Ensure data collection service is running
  useEffect(() => {
    const service = getDataCollectionService()

    // Service auto-starts, but ensure it's running
    if (!isConnected) {
      service.start()
    }

    return () => {
      // Don't stop on unmount - let the service manage itself
    }
  }, [isConnected])

  // Calculate cache hit rate
  const cacheHitRate =
    cacheHits + cacheMisses > 0 ? Math.round((cacheHits / (cacheHits + cacheMisses)) * 100) : 0

  // Check if we have data
  const hasData = docker || system || containers.length > 0

  // If no data yet, show loading state
  if (!hasData && !error) {
    return <DashboardSkeleton />
  }

  // Show error state if disconnected
  if (error) {
    return (
      <>
        <HeroPattern />
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">System overview and metrics</p>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">Connection Error</h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <HeroPattern />

      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">System overview and metrics</p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
                  isConnected
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                />
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && !alerts[0]?.acknowledged && (
          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div className="flex-1">
                <h3 className="font-medium text-yellow-900 dark:text-yellow-100">
                  System Alerts ({alerts.filter((a) => !a.acknowledged).length})
                </h3>
                <div className="mt-2 space-y-1">
                  {alerts.slice(0, 3).map((alert) => (
                    <p key={alert.id} className="text-sm text-yellow-700 dark:text-yellow-200">
                      • {alert.message}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Metrics */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="CPU Usage"
            value={`${Math.round(docker?.cpu || 0)}%`}
            percentage={docker?.cpu || 0}
            description={`System: ${Math.round(system?.cpu || 0)}%`}
            icon={Cpu}
          />

          <MetricCard
            title="Memory Usage"
            value={`${docker?.memory?.percentage || 0}%`}
            percentage={docker?.memory?.percentage || 0}
            description={`${docker?.memory?.used || 0}GB / ${docker?.memory?.total || 0}GB`}
            icon={MemoryStick}
          />

          <MetricCard
            title="Storage Usage"
            value={`${docker?.storage?.percentage || 0}%`}
            percentage={docker?.storage?.percentage || 0}
            description={`${docker?.storage?.used || 0}GB / ${docker?.storage?.total || 0}GB`}
            icon={HardDrive}
          />

          <MetricCard
            title="Network Traffic"
            value={`${((docker?.network?.rx || 0) + (docker?.network?.tx || 0)).toFixed(1)} Mbps`}
            percentage={Math.min(
              (((docker?.network?.rx || 0) + (docker?.network?.tx || 0)) /
                (docker?.network?.maxSpeed || 1000)) *
                100,
              100
            )}
            description={`↓ ${docker?.network?.rx || 0} ↑ ${docker?.network?.tx || 0} Mbps`}
            icon={Network}
          />
        </div>

        {/* Container Status */}
        <div className="mb-8">
          <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
            Container Status
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <StatusCard
              title="Running"
              count={docker?.containers?.running || 0}
              icon={Play}
              color="green"
            />
            <StatusCard
              title="Healthy"
              count={docker?.containers?.healthy || 0}
              icon={CheckCircle}
              color="blue"
            />
            <StatusCard
              title="Stopped"
              count={docker?.containers?.stopped || 0}
              icon={Clock}
              color="gray"
            />
            <StatusCard
              title="Unhealthy"
              count={docker?.containers?.unhealthy || 0}
              icon={AlertCircle}
              color="red"
            />
          </div>
        </div>

        {/* Services Overview */}
        <div className="mb-8">
          <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">Services</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* PostgreSQL */}
            <ServiceCard
              name="PostgreSQL"
              status={
                servicesHealth.find((s) => s.name.toLowerCase().includes('postgres'))?.status ||
                'stopped'
              }
              icon={Database}
              description="Primary database"
              metrics={[
                {
                  label: 'Connections',
                  value: `${useCentralDataStore.getState().postgres?.connections?.active || 0} / ${useCentralDataStore.getState().postgres?.connections?.max || 100}`,
                },
                {
                  label: 'Size',
                  value: useCentralDataStore.getState().postgres?.databaseSize || 'Unknown',
                },
              ]}
            />

            {/* Hasura */}
            <ServiceCard
              name="Hasura GraphQL"
              status={
                servicesHealth.find((s) => s.name.toLowerCase().includes('hasura'))?.status ||
                'stopped'
              }
              icon={Globe}
              description="GraphQL API engine"
              metrics={[
                {
                  label: 'Tables',
                  value: useCentralDataStore.getState().hasura?.metadata?.tables || 0,
                },
                {
                  label: 'Subscriptions',
                  value:
                    useCentralDataStore.getState().hasura?.performance?.activeSubscriptions || 0,
                },
              ]}
            />

            {/* Redis */}
            <ServiceCard
              name="Redis Cache"
              status={
                servicesHealth.find((s) => s.name.toLowerCase().includes('redis'))?.status ||
                'stopped'
              }
              icon={Zap}
              description="In-memory cache"
              metrics={[
                {
                  label: 'Memory',
                  value: `${useCentralDataStore.getState().redis?.memory?.used || 0} MB`,
                },
                {
                  label: 'Hit Rate',
                  value: `${useCentralDataStore.getState().redis?.hitRate || 0}%`,
                },
              ]}
            />

            {/* Auth Service */}
            <ServiceCard
              name="Authentication"
              status={
                servicesHealth.find((s) => s.name.toLowerCase().includes('auth'))?.status ||
                'stopped'
              }
              icon={Shield}
              description="Auth & JWT service"
            />

            {/* Nginx */}
            <ServiceCard
              name="Nginx Proxy"
              status={
                servicesHealth.find((s) => s.name.toLowerCase().includes('nginx'))?.status ||
                'stopped'
              }
              icon={Network}
              description="Reverse proxy & load balancer"
            />

            {/* MinIO */}
            <ServiceCard
              name="MinIO Storage"
              status={
                servicesHealth.find((s) => s.name.toLowerCase().includes('minio'))?.status ||
                'stopped'
              }
              icon={HardDrive}
              description="S3-compatible object storage"
            />
          </div>
        </div>

        {/* Performance Stats */}
        <div className="mb-8 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <span className="text-zinc-600 dark:text-zinc-400">
                API Calls:{' '}
                <span className="font-medium text-zinc-900 dark:text-white">{apiCallsCount}</span>
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                Cache Hits:{' '}
                <span className="font-medium text-green-600 dark:text-green-400">{cacheHits}</span>
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                Cache Misses:{' '}
                <span className="font-medium text-red-600 dark:text-red-400">{cacheMisses}</span>
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                Hit Rate:{' '}
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {cacheHitRate}%
                </span>
              </span>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Last update:{' '}
              {useCentralDataStore.getState().lastUpdate?.toLocaleTimeString() || 'Never'}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
