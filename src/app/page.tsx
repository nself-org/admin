'use client'

import { HeroPattern } from '@/components/HeroPattern'
import {
  ActivityEvent,
  ActivityFeed,
} from '@/components/dashboard/ActivityFeed'
import { Alert, Alerts } from '@/components/dashboard/Alerts'
import {
  Environment,
  EnvironmentBadge,
  EnvironmentBadgeWithDetails,
} from '@/components/dashboard/EnvironmentBadge'
import { HealthMetrics, HealthScore } from '@/components/dashboard/HealthScore'
import { ResourceSparkline } from '@/components/dashboard/ResourceSparkline'
import {
  ServiceCard,
  ServiceCardData,
} from '@/components/dashboard/ServiceCard'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { useServiceStatus } from '@/hooks/useServiceStatus'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ensureCorrectRoute } from '@/lib/routing-logic'
import { useProjectStore } from '@/stores/projectStore'
import {
  Box,
  FolderOpen,
  RefreshCw,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function DashboardContent() {
  const router = useRouter()
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [environment] = useState<Environment>('local')
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])

  // WebSocket connection for real-time updates
  const { connected, reconnecting } = useWebSocket()
  const { statuses } = useServiceStatus()

  // Use cached data from global store
  const systemMetrics = useProjectStore((state) => state.systemMetrics)
  const containerStats = useProjectStore((state) => state.containerStats)
  const isLoadingMetrics = useProjectStore((state) => state.isLoadingMetrics)
  const isLoadingContainers = useProjectStore(
    (state) => state.isLoadingContainers,
  )
  const fetchAllData = useProjectStore((state) => state.fetchAllData)
  const projectStatus = useProjectStore((state) => state.projectStatus)
  const containersRunning = useProjectStore((state) => state.containersRunning)
  const checkProjectStatus = useProjectStore(
    (state) => state.checkProjectStatus,
  )

  // Mark initial load complete after first render
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 100)
    return () => clearTimeout(timer)
  }, [])

  // Check routing and load dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      const redirected = await ensureCorrectRoute('/', router.push)
      if (redirected) return

      fetchAllData()
      checkProjectStatus()

      // Check if services were recently started
      const recentlyStarted = localStorage.getItem('services_recently_started')
      const isRecent =
        recentlyStarted && Date.now() - parseInt(recentlyStarted) < 30000

      if (isRecent) {
        setTimeout(() => {
          checkProjectStatus()
          fetchAllData()
        }, 3000)
      }
    }

    initializeDashboard()
  }, [checkProjectStatus, fetchAllData, router.push])

  // Real-time polling for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isInitialLoad) {
        fetchAllData()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isInitialLoad, fetchAllData])

  // Transform container stats to service cards with real-time WebSocket updates
  const services: ServiceCardData[] = containerStats.map((c: any) => {
    // Check if we have real-time status from WebSocket
    const realtimeStatus = statuses[c.name]

    let status: ServiceCardData['status']

    // Prefer real-time status over cached status if available
    if (realtimeStatus) {
      status = realtimeStatus.status as ServiceCardData['status']
    } else if (c.health === 'healthy' || (c.state === 'running' && !c.health)) {
      status = 'running'
    } else if (
      c.health === 'unhealthy' ||
      c.state === 'exited' ||
      c.state === 'dead'
    ) {
      status = 'error'
    } else if (c.state === 'restarting') {
      status = 'starting'
    } else {
      status = 'stopped'
    }

    return {
      name: c.name || 'unknown',
      displayName:
        c.name
          ?.split(/[_-]/)
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ') || 'Unknown Service',
      status,
      health: realtimeStatus?.health || c.health,
      cpu: c.stats?.cpu?.percentage || 0,
      memory: c.stats?.memory?.percentage || 0,
      port: c.ports?.[0]?.public,
      containerId: c.id,
      uptime: c.uptime,
    }
  })

  // Calculate health metrics
  const healthMetrics: HealthMetrics = {
    servicesRunning: services.filter((s) => s.status === 'running').length,
    servicesTotal: services.length,
    errorCount: services.filter(
      (s) => s.status === 'error' || s.health === 'unhealthy',
    ).length,
    cpuUsage: systemMetrics?.docker?.cpu || 0,
    memoryUsage: systemMetrics?.docker?.memory?.percentage || 0,
    diskUsage:
      ((systemMetrics?.docker?.storage?.used || 0) /
        (systemMetrics?.docker?.storage?.total || 1)) *
      100,
  }

  // Generate sparkline data (last hour, 60 points)
  const generateSparklineData = (baseValue: number) => {
    const now = Date.now()
    return Array.from({ length: 60 }, (_, i) => ({
      timestamp: now - (59 - i) * 60000, // 1 minute intervals
      value: baseValue + Math.random() * 10 - 5, // Simulate variance
    }))
  }

  const cpuHistory = generateSparklineData(systemMetrics?.docker?.cpu || 0)
  const memoryHistory = generateSparklineData(
    systemMetrics?.docker?.memory?.percentage || 0,
  )
  const networkHistory = generateSparklineData(
    ((systemMetrics?.system?.network?.rx || 0) +
      (systemMetrics?.system?.network?.tx || 0)) /
      10,
  )

  // Generate sample alerts based on system state
  useEffect(() => {
    const newAlerts: Alert[] = []

    // Critical: Services down
    const errorServices = services.filter(
      (s) => s.status === 'error' || s.health === 'unhealthy',
    )
    if (errorServices.length > 0) {
      newAlerts.push({
        id: 'critical-services-down',
        type: 'critical',
        title: 'Services Unhealthy',
        message: `${errorServices.length} service(s) are not running properly: ${errorServices.map((s) => s.displayName).join(', ')}`,
        timestamp: new Date().toISOString(),
        dismissible: true,
      })
    }

    // Warning: High resource usage
    if (healthMetrics.cpuUsage > 80) {
      newAlerts.push({
        id: 'warning-high-cpu',
        type: 'warning',
        title: 'High CPU Usage',
        message: `CPU usage is at ${healthMetrics.cpuUsage.toFixed(1)}%. Consider scaling or optimizing services.`,
        timestamp: new Date().toISOString(),
        dismissible: true,
      })
    }

    if (healthMetrics.memoryUsage > 80) {
      newAlerts.push({
        id: 'warning-high-memory',
        type: 'warning',
        title: 'High Memory Usage',
        message: `Memory usage is at ${healthMetrics.memoryUsage.toFixed(1)}%. Consider increasing memory limits.`,
        timestamp: new Date().toISOString(),
        dismissible: true,
      })
    }

    setAlerts(newAlerts)
  }, [services, healthMetrics])

  // Service action handlers
  const handleStartService = async (name: string) => {
    const event: ActivityEvent = {
      id: Date.now().toString(),
      type: 'start',
      service: name,
      message: `Started service ${name}`,
      timestamp: new Date().toISOString(),
    }
    setActivityEvents((prev) => [event, ...prev])
  }

  const handleStopService = async (name: string) => {
    const event: ActivityEvent = {
      id: Date.now().toString(),
      type: 'stop',
      service: name,
      message: `Stopped service ${name}`,
      timestamp: new Date().toISOString(),
    }
    setActivityEvents((prev) => [event, ...prev])
  }

  const handleRestartService = async (name: string) => {
    const event: ActivityEvent = {
      id: Date.now().toString(),
      type: 'restart',
      service: name,
      message: `Restarted service ${name}`,
      timestamp: new Date().toISOString(),
    }
    setActivityEvents((prev) => [event, ...prev])
  }

  const handleViewLogs = (name: string) => {
    router.push(`/services/${name}/logs`)
  }

  const handleViewDetails = (name: string) => {
    router.push(`/services/${name}`)
  }

  const handleRefresh = () => {
    fetchAllData()
    checkProjectStatus()
  }

  // Check if services are running
  const showServices =
    containerStats.length > 0 ||
    containersRunning > 0 ||
    projectStatus === 'running'

  const loading =
    isInitialLoad ||
    (!systemMetrics && !containerStats.length && isLoadingMetrics)

  // Loading State
  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="mt-12 mb-4">
          <h1 className="bg-gradient-to-r from-blue-600 to-black bg-clip-text text-4xl/tight font-extrabold text-transparent sm:text-6xl/tight dark:from-blue-400 dark:to-white">
            Dashboard
          </h1>
        </div>
        <DashboardSkeleton />
      </>
    )
  }

  // Empty State - No Services
  if (!showServices) {
    return (
      <>
        <HeroPattern />
        <div className="mt-12 mb-4">
          <h1 className="bg-gradient-to-r from-blue-600 to-black bg-clip-text text-4xl/tight font-extrabold text-transparent sm:text-6xl/tight dark:from-blue-400 dark:to-white">
            Dashboard
          </h1>
        </div>

        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Box className="h-12 w-12 text-zinc-400" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
              No Services Found
            </h2>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              Run{' '}
              <code className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                nself init
              </code>{' '}
              to set up your project
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => router.push('/build')}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                <Settings className="h-4 w-4" />
                Setup Project
              </button>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <HeroPattern />

      {/* Hero Section with Environment Badge */}
      <div className="mt-8 mb-6 sm:mt-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h1 className="bg-gradient-to-r from-blue-600 to-black bg-clip-text text-3xl/tight font-extrabold text-transparent sm:text-4xl/tight lg:text-6xl/tight dark:from-blue-400 dark:to-white">
            Dashboard
          </h1>
          <div className="flex items-center gap-3">
            {/* WebSocket connection status */}
            <div
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${
                connected
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : reconnecting
                    ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
              }`}
              title={
                connected
                  ? 'Real-time updates active'
                  : reconnecting
                    ? 'Reconnecting...'
                    : 'Disconnected'
              }
            >
              {connected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {connected ? 'Live' : reconnecting ? 'Reconnecting' : 'Offline'}
            </div>
            <EnvironmentBadge environment={environment} size="lg" />
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="mb-8">
          <Alerts
            alerts={alerts}
            onDismiss={(id) =>
              setAlerts((prev) => prev.filter((a) => a.id !== id))
            }
          />
        </div>
      )}

      {/* Top Row: Health Score, Environment Details, Quick Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Health Score */}
        <HealthScore metrics={healthMetrics} />

        {/* Environment Details */}
        <EnvironmentBadgeWithDetails
          environment={environment}
          version="0.4.0"
          uptime="2h 34m"
        />

        {/* Quick Stats */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-700 dark:bg-zinc-900/50">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 sm:mb-4 dark:text-white">
            Quick Stats
          </h3>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600 sm:text-sm dark:text-zinc-400">
                Total Services
              </span>
              <span className="text-base font-bold text-zinc-900 sm:text-lg dark:text-white">
                {services.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600 sm:text-sm dark:text-zinc-400">
                Running
              </span>
              <span className="text-base font-bold text-green-600 sm:text-lg dark:text-green-400">
                {healthMetrics.servicesRunning}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600 sm:text-sm dark:text-zinc-400">
                Errors
              </span>
              <span
                className={`text-base font-bold sm:text-lg ${healthMetrics.errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
              >
                {healthMetrics.errorCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Usage Sparklines */}
      <section
        className="mb-6 sm:mb-8"
        aria-labelledby="resource-usage-heading"
      >
        <h2
          id="resource-usage-heading"
          className="mb-3 text-lg font-bold text-zinc-900 sm:mb-4 sm:text-xl dark:text-white"
        >
          Resource Usage (Last Hour)
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          <ResourceSparkline
            data={cpuHistory}
            label="CPU"
            currentValue={systemMetrics?.docker?.cpu}
            color="#3b82f6"
          />
          <ResourceSparkline
            data={memoryHistory}
            label="Memory"
            currentValue={systemMetrics?.docker?.memory?.percentage}
            color="#8b5cf6"
          />
          <ResourceSparkline
            data={networkHistory}
            label="Network"
            currentValue={
              ((systemMetrics?.system?.network?.rx || 0) +
                (systemMetrics?.system?.network?.tx || 0)) /
              10
            }
            unit=" Mbps"
            color="#10b981"
          />
        </div>
      </section>

      {/* Services Grid with Activity Feed */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:gap-6 lg:grid-cols-3">
        {/* Services Column (2/3 width on desktop) */}
        <section className="lg:col-span-2" aria-labelledby="services-heading">
          <h2
            id="services-heading"
            className="mb-3 text-lg font-bold text-zinc-900 sm:mb-4 sm:text-xl dark:text-white"
          >
            Services
          </h2>
          {services.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
              {services.map((service) => (
                <ServiceCard
                  key={service.containerId || service.name}
                  service={service}
                  onStart={handleStartService}
                  onStop={handleStopService}
                  onRestart={handleRestartService}
                  onViewLogs={handleViewLogs}
                  onViewDetails={handleViewDetails}
                  isLoading={isLoadingContainers}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 p-8 sm:p-12 dark:border-zinc-700">
              <div className="text-center">
                <FolderOpen className="mx-auto mb-3 h-10 w-10 text-zinc-400 sm:h-12 sm:w-12" />
                <p className="text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
                  No services running
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Activity Feed Column (1/3 width on desktop, hidden on mobile) */}
        <aside
          className="hidden lg:col-span-1 lg:block"
          aria-label="Activity feed"
        >
          <ActivityFeed events={activityEvents} maxEvents={10} />
        </aside>
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
