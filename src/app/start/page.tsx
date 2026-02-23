'use client'

interface ServiceInfo {
  container_name?: string
  image?: string
  ports?: string[]
  restart?: string
  customInfo?: {
    type?: string
    route?: string
  }
}

interface ProjectInfo {
  projectName?: string
  environment?: string
  domain?: string
  databaseName?: string
  dbPassword?: string
  totalServices?: number
  backupEnabled?: boolean
  backupSchedule?: string
  projectPath?: string
  servicesByCategory?: {
    required?: string[]
    optional?: string[]
    user?: string[]
  }
  frontendApps?: Array<{ name?: string; url?: string }>
  services?: Record<string, ServiceInfo>
}

interface ServiceDetail {
  ports?: string[]
  restart?: string
  image?: string
  container_name?: string
  customInfo?: {
    type?: string
    route?: string
  }
}


import { Button } from '@/components/Button'
import { GridPattern } from '@/components/GridPattern'
import { HeroPattern } from '@/components/HeroPattern'
import { safeNavigate } from '@/lib/routing'
import { ensureCorrectRoute } from '@/lib/routing-logic'
import { useProjectStore } from '@/stores/projectStore'
import type { MotionValue } from 'framer-motion'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Server,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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

function ProjectInfoCard({
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

// Helper to get detailed service information
function getServiceInfo(name: string): {
  description: string
  details: string[]
} {
  const lowerName = name.toLowerCase()

  // Core services
  if (lowerName === 'postgres') {
    return {
      description: 'PostgreSQL Database - Primary data store',
      details: [
        'Container: postgres',
        'Image: postgres:15-alpine',
        'Port: 5432',
        'Stores all application data',
      ],
    }
  }
  if (lowerName === 'hasura') {
    return {
      description: 'Hasura GraphQL Engine',
      details: [
        'Container: hasura',
        'Image: hasura/graphql-engine:v2.36.0',
        'Port: 8080',
        'Instant GraphQL API with subscriptions',
      ],
    }
  }
  if (lowerName === 'auth') {
    return {
      description: 'Hasura Auth Service',
      details: [
        'Container: auth',
        'Image: nhost/hasura-auth:0.36.0',
        'Port: 4000',
        'JWT tokens & session management',
      ],
    }
  }
  if (lowerName === 'nginx') {
    return {
      description: 'Nginx Reverse Proxy',
      details: [
        'Container: nginx',
        'Image: nginx:alpine',
        'Ports: 80, 443',
        'Routes requests & SSL termination',
      ],
    }
  }

  // Storage services
  if (lowerName === 'minio') {
    return {
      description: 'MinIO Object Storage',
      details: [
        'Container: minio',
        'Image: minio/minio:latest',
        'Ports: 9000, 9001',
        'S3-compatible storage',
      ],
    }
  }
  if (lowerName === 'storage') {
    return {
      description: 'Hasura Storage Service',
      details: [
        'Container: storage',
        'Image: nhost/hasura-storage:0.6.1',
        'Port: 5001',
        'S3-compatible API for file operations',
      ],
    }
  }

  // Optional services
  if (lowerName === 'nself-admin') {
    return {
      description: 'nself Admin UI',
      details: [
        'Container: nself-admin',
        'Image: nself/nself-admin:latest',
        'Port: 3021',
        'Web management interface',
      ],
    }
  }
  if (lowerName === 'mailpit') {
    return {
      description: 'Mailpit Email Server',
      details: [
        'Container: mailpit',
        'Image: axllent/mailpit:latest',
        'Ports: 1025, 8025',
        'Email testing & capture',
      ],
    }
  }
  if (lowerName === 'meilisearch') {
    return {
      description: 'MeiliSearch Engine',
      details: [
        'Container: meilisearch',
        'Image: getmeili/meilisearch:v1.5',
        'Port: 7700',
        'Full-text search engine',
      ],
    }
  }
  if (lowerName === 'redis') {
    return {
      description: 'Redis Cache',
      details: [
        'Container: redis',
        'Image: redis:7-alpine',
        'Port: 6379',
        'In-memory data store',
      ],
    }
  }
  if (lowerName === 'functions') {
    return {
      description: 'Functions (Serverless)',
      details: [
        'Container: functions',
        'Image: nhost/functions:latest',
        'Port: 3000',
        'Serverless TypeScript/JavaScript functions',
      ],
    }
  }
  if (lowerName === 'mlflow') {
    return {
      description: 'MLflow Platform',
      details: [
        'Container: mlflow',
        'Image: ghcr.io/mlflow/mlflow:v2.9.2',
        'Port: 5001',
        'ML lifecycle management',
      ],
    }
  }

  // Monitoring stack
  if (lowerName === 'grafana') {
    return {
      description: 'Grafana Dashboards',
      details: [
        'Container: grafana',
        'Image: grafana/grafana:10.2.3',
        'Port: 3000',
        'Metrics visualization',
      ],
    }
  }
  if (lowerName === 'prometheus') {
    return {
      description: 'Prometheus Metrics',
      details: [
        'Container: prometheus',
        'Image: prom/prometheus:v2.48.1',
        'Port: 9090',
        'Time-series database',
      ],
    }
  }
  if (lowerName === 'loki') {
    return {
      description: 'Loki Log Aggregation',
      details: [
        'Container: loki',
        'Image: grafana/loki:2.9.3',
        'Port: 3100',
        'Centralized logging',
      ],
    }
  }
  if (lowerName === 'tempo') {
    return {
      description: 'Tempo Tracing',
      details: [
        'Container: tempo',
        'Image: grafana/tempo:2.3.1',
        'Port: 3200',
        'Distributed tracing',
      ],
    }
  }
  if (lowerName === 'jaeger') {
    return {
      description: 'Jaeger UI',
      details: [
        'Container: jaeger',
        'Image: jaegertracing/all-in-one:1.52',
        'Port: 16686',
        'Trace visualization',
      ],
    }
  }
  if (lowerName === 'alertmanager') {
    return {
      description: 'Alert Manager',
      details: [
        'Container: alertmanager',
        'Image: prom/alertmanager:v0.26.0',
        'Port: 9093',
        'Alert routing & notifications',
      ],
    }
  }
  if (lowerName === 'node-exporter') {
    return {
      description: 'System Metrics (Node Exporter)',
      details: [
        'Container: node-exporter',
        'Image: prom/node-exporter:v1.7.0',
        'Port: 9100',
        'Host system metrics',
      ],
    }
  }
  if (lowerName === 'postgres-exporter') {
    return {
      description: 'Database Metrics (PostgreSQL Exporter)',
      details: [
        'Container: postgres-exporter',
        'Image: prometheuscommunity/postgres-exporter:v0.15.0',
        'Port: 9187',
        'Database performance metrics',
      ],
    }
  }
  if (lowerName === 'cadvisor') {
    return {
      description: 'Container Metrics (cAdvisor)',
      details: [
        'Container: cadvisor',
        'Image: gcr.io/cadvisor/cadvisor:v0.47.2',
        'Port: 8080',
        'Container resource usage',
      ],
    }
  }

  // Custom services
  if (lowerName.startsWith('cs')) {
    const serviceNum = name.replace(/cs/i, '')
    return {
      description: `Custom Service ${serviceNum}`,
      details: [
        `Container: ${name}`,
        'User-defined service',
        'Check .env file for details',
      ],
    }
  }

  // Default
  return {
    description: name,
    details: ['Service component'],
  }
}

// Keep simple description helper for backward compatibility
function _getServiceDescription(name: string): string {
  const info = getServiceInfo(name)
  return `${info.description}\n${info.details.join('\n')}`
}

// Helper to get service display name
function getServiceDisplayName(name: string): string {
  const lowerName = name.toLowerCase()

  // Core services
  if (lowerName === 'postgres') return 'PostgreSQL'
  if (lowerName === 'hasura') return 'Hasura GraphQL'
  if (lowerName === 'auth') return 'Authentication'
  if (lowerName === 'nginx') return 'Nginx Proxy'

  // Storage services
  if (lowerName === 'minio') return 'MinIO Storage'
  if (lowerName === 'storage') return 'Storage API'

  // Mail & Search
  if (lowerName === 'mailpit') return 'Mailpit'
  if (lowerName === 'meilisearch') return 'MeiliSearch'

  // Cache
  if (lowerName === 'redis') return 'Redis Cache'

  // Functions
  if (lowerName === 'functions') return 'Functions'

  // ML
  if (lowerName === 'mlflow') return 'MLflow'

  // Admin UI
  if (lowerName === 'nself-admin') return 'nself Admin UI'

  // Monitoring stack
  if (lowerName === 'grafana') return 'Grafana'
  if (lowerName === 'prometheus') return 'Prometheus'
  if (lowerName === 'loki') return 'Loki Logs'
  if (lowerName === 'tempo') return 'Tempo Tracing'
  if (lowerName === 'alertmanager') return 'Alert Manager'
  if (lowerName === 'node-exporter') return 'System Metrics'
  if (lowerName === 'postgres-exporter') return 'Database Metrics'
  if (lowerName === 'cadvisor') return 'Container Metrics'
  if (lowerName === 'jaeger') return 'Jaeger'

  // Admin
  if (lowerName === 'nself-admin') return 'nself Admin UI'

  // Default: capitalize and clean up
  return name
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function StartPage() {
  const router = useRouter()
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null)
  const [_serviceDetails, setServiceDetails] = useState<Record<string, ServiceDetail> | null>(null)
  const [_loadingServices, setLoadingServices] = useState(true)
  const [starting, setStarting] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showDbPassword, setShowDbPassword] = useState(false)
  const [initialCheck, setInitialCheck] = useState(true)
  const [startProgress, setStartProgress] = useState<{
    message: string
    percentage?: number
    type?:
      | 'status'
      | 'progress'
      | 'download'
      | 'container'
      | 'error'
      | 'complete'
    instructions?: string[]
  }>({ message: '' })

  const checkProjectStatus = useProjectStore(
    (state) => state.checkProjectStatus,
  )
  const _projectStatus = useProjectStore((state) => state.projectStatus)

  // Check routing and load start page data
  useEffect(() => {
    const initializeStartPage = async () => {
      try {
        // Safety check: ensure we should be on the start page
        const redirected = await ensureCorrectRoute('/start', router.push)
        if (redirected) {
          return // Don't load data if we're redirecting
        }

        await checkProjectStatus()
        setInitialCheck(false)
      } catch (error) {
        console.error('Error checking project status:', error)
        setInitialCheck(false)
      }
    }

    initializeStartPage()
  }, [checkProjectStatus, router.push])

  // Fetch project info and service details
  useEffect(() => {
    fetchProjectInfo()
    fetchServiceDetails()
  }, [])

  const fetchProjectInfo = async () => {
    try {
      const res = await fetch('/api/project/info')
      const data = await res.json()
      if (data.success) {
        setProjectInfo(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch project info:', error)
    }
  }

  const fetchServiceDetails = async () => {
    try {
      setLoadingServices(true)
      const response = await fetch('/api/project/services-detail')
      if (response.ok) {
        const data = await response.json()
        setServiceDetails(data.services)
      }
    } catch (error) {
      console.error('Failed to fetch service details:', error)
    } finally {
      setLoadingServices(false)
    }
  }

  const startServices = async () => {
    try {
      setStarting(true)
      setStartProgress({
        message: 'Initializing Docker services...',
        type: 'status',
      })

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('nself-csrf='))
        ?.split('=')[1]

      // Use streaming API for real-time progress
      const response = await fetch('/api/nself/start-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Start failed with status:', response.status)
        console.error('Error response:', errorText)
        throw new Error(
          `Failed to start services: ${response.status} - ${errorText}`,
        )
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter((line) => line.trim())

          for (const line of lines) {
            try {
              const data = JSON.parse(line)

              switch (data.type) {
                case 'status':
                  setStartProgress({
                    message: data.message,
                    type: 'status',
                  })
                  break

                case 'progress':
                  setStartProgress({
                    message: data.message,
                    percentage: data.percentage,
                    type: 'progress',
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
                    message: data.message || `Starting containers...`,
                    percentage: data.percentage,
                    type: 'container',
                  })
                  // Update if we have current/total info
                  if (data.current && data.total) {
                    setStartProgress({
                      message: `Starting containers: ${data.current}/${data.total}`,
                      percentage: data.percentage,
                      type: 'container',
                    })
                  }
                  break

                case 'error': {
                  // Store full error details including instructions
                  const errorProgress: any = {
                    message: data.message || 'An error occurred',
                    type: 'error',
                  }

                  // Store instructions if provided
                  if (data.instructions) {
                    errorProgress.instructions = data.instructions
                  }

                  console.error(
                    'Start error:',
                    data.message,
                    data.errorOutput,
                    data.instructions,
                  )
                  setStarting(false) // Reset starting state on error
                  break
                }

                case 'complete':
                  setStartProgress({
                    message: data.message,
                    percentage: 100,
                    type: 'complete',
                  })
                  // Mark that services were recently started
                  localStorage.setItem(
                    'services_recently_started',
                    Date.now().toString(),
                  )

                  // Wait longer and verify services are actually running before redirect
                  setTimeout(async () => {
                    // Check if services are actually running
                    await checkProjectStatus()
                    const status = useProjectStore.getState().projectStatus
                    if (status === 'running') {
                      safeNavigate(router, '/', true) // Force navigation to dashboard
                    } else {
                      // Services might still be starting, wait a bit more
                      setTimeout(() => {
                        safeNavigate(router, '/', true) // Force navigation to dashboard
                      }, 3000)
                    }
                  }, 3000)
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

  // Show loading state while checking if we should redirect
  if (initialCheck) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
        <HeroPattern />
        <div className="relative z-10 text-center">
          <div className="animate-pulse">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
              <div className="h-6 w-6 animate-ping rounded-full bg-blue-500" />
            </div>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              Checking services...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
      <HeroPattern />

      <div className="relative z-10 mx-auto w-full max-w-2xl px-6">
        <div className="group relative rounded-2xl bg-zinc-50 p-8 dark:bg-white/2.5">
          <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/7.5 ring-inset group-hover:ring-zinc-900/10 dark:ring-white/10 dark:group-hover:ring-white/20" />
          <div className="relative text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
              <div className="h-6 w-6 rounded-full bg-blue-500" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">
              Ready to Launch
            </h2>

            {projectInfo && (
              <>
                {/* First Row: Status and Environment */}
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ProjectInfoCard
                    icon={CheckCircle}
                    label="Status"
                    value="Built"
                    pattern={{
                      y: 22,
                      squares: [[0, 1]],
                    }}
                  />
                  <ProjectInfoCard
                    icon={Server}
                    label="Env"
                    value={
                      projectInfo.environment === 'dev'
                        ? 'Dev'
                        : projectInfo.environment === 'staging'
                          ? 'Staging'
                          : projectInfo.environment === 'production'
                            ? 'Prod'
                            : 'Dev'
                    }
                    pattern={{
                      y: 16,
                      squares: [
                        [0, 1],
                        [1, 3],
                      ],
                    }}
                  />
                </div>

                {/* Second Row: Project Name and Base Domain */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 dark:border-blue-800 dark:from-blue-900/20 dark:to-blue-800/10">
                    <div className="text-xs font-medium text-blue-700 dark:text-blue-400">
                      Project Name
                    </div>
                    <div className="mt-1 text-center text-sm font-semibold text-blue-900 dark:text-blue-200">
                      {projectInfo.projectName || 'nself-project'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 dark:border-blue-800 dark:from-blue-900/20 dark:to-blue-800/10">
                    <div className="text-xs font-medium text-blue-700 dark:text-blue-400">
                      Base Domain
                    </div>
                    <div className="mt-1 text-center text-sm font-semibold text-blue-900 dark:text-blue-200">
                      {projectInfo.domain || 'localhost'}
                    </div>
                  </div>
                </div>

                {/* Third Row: Database Name and Database Password */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 dark:border-blue-800 dark:from-blue-900/20 dark:to-blue-800/10">
                    <div className="text-xs font-medium text-blue-700 dark:text-blue-400">
                      Database Name
                    </div>
                    <div className="mt-1 text-center text-sm font-semibold text-blue-900 dark:text-blue-200">
                      {projectInfo.databaseName || 'postgres'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 dark:border-blue-800 dark:from-blue-900/20 dark:to-blue-800/10">
                    <div className="text-xs font-medium text-blue-700 dark:text-blue-400">
                      Database Password
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-2">
                      <div className="text-center text-sm font-semibold text-blue-900 dark:text-blue-200">
                        {showDbPassword
                          ? projectInfo?.dbPassword || 'No password found'
                          : '••••••••'}
                      </div>
                      <button
                        onClick={() => setShowDbPassword(!showDbPassword)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {showDbPassword ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="rounded-xl bg-zinc-50/50 p-3 dark:bg-zinc-800/30">
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="flex w-full items-center justify-between text-sm font-semibold text-zinc-700 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                    >
                      <span>
                        Total Services:{' '}
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {projectInfo?.totalServices || 0}
                        </span>
                      </span>
                      {showDetails ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {showDetails && (
                      <div className="mt-3 space-y-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                        {/* Required Services */}
                        {(projectInfo.servicesByCategory?.required?.length ?? 0) >
                          0 && (
                          <div>
                            <div className="mb-2 flex items-center space-x-2">
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                Required (
                                {projectInfo.servicesByCategory?.required?.length ?? 0}
                                )
                              </span>
                            </div>
                            <div className="ml-4 space-y-1">
                              {projectInfo.servicesByCategory?.required?.map(
                                (service: string, _idx: number) => {
                                  const serviceData = _serviceDetails?.[service]
                                  const info = serviceData
                                    ? {
                                        description:
                                          getServiceDisplayName(service),
                                        details: [
                                          serviceData.container_name &&
                                            `Container: ${serviceData.container_name}`,
                                          serviceData.image &&
                                            `Image: ${serviceData.image}`,
                                          (serviceData.ports?.length ?? 0) > 0 &&
                                            `Ports: ${serviceData.ports?.map((p: string) => p.split(':')[0]).join(', ')}`,
                                          serviceData.restart &&
                                            `Restart: ${serviceData.restart}`,
                                        ].filter(Boolean),
                                      }
                                    : getServiceInfo(service)
                                  return (
                                    <div
                                      key={service}
                                      className="flex items-center space-x-2 text-sm"
                                    >
                                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                                      <span className="text-zinc-700 dark:text-zinc-300">
                                        {getServiceDisplayName(service)}
                                      </span>
                                      <div className="group/tooltip relative isolate inline-flex">
                                        <svg
                                          className="h-4 w-4 flex-shrink-0 cursor-help text-zinc-400 dark:text-zinc-500"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                          />
                                        </svg>
                                        <div className="pointer-events-none invisible absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg bg-gray-900 p-3 text-xs text-white opacity-0 shadow-lg transition-all duration-200 group-hover/tooltip:visible group-hover/tooltip:opacity-100">
                                          <div className="mb-2 font-semibold">
                                            {info.description}
                                          </div>
                                          <div className="space-y-1 text-gray-300">
                                            {info.details.map((detail, i) => (
                                              <div key={i} className="text-xs">
                                                {detail}
                                              </div>
                                            ))}
                                          </div>
                                          <div className="absolute top-full left-2 h-0 w-0 border-t-4 border-r-4 border-l-4 border-transparent border-t-gray-900"></div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                },
                              )}
                            </div>
                          </div>
                        )}

                        {/* Optional Services */}
                        {(projectInfo.servicesByCategory?.optional?.length ?? 0) >
                          0 && (
                          <div>
                            <div className="mb-2 flex items-center space-x-2">
                              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                                Optional (
                                {projectInfo.servicesByCategory?.optional?.length ?? 0}
                                )
                              </span>
                            </div>
                            <div className="ml-4 space-y-1">
                              {projectInfo.servicesByCategory?.optional?.map(
                                (service: string, _idx: number) => {
                                  const serviceData = _serviceDetails?.[service]
                                  const info = serviceData
                                    ? {
                                        description:
                                          getServiceDisplayName(service),
                                        details: [
                                          serviceData.container_name &&
                                            `Container: ${serviceData.container_name}`,
                                          serviceData.image &&
                                            `Image: ${serviceData.image}`,
                                          (serviceData.ports?.length ?? 0) > 0 &&
                                            `Ports: ${serviceData.ports?.map((p: string) => p.split(':')[0]).join(', ')}`,
                                          serviceData.restart &&
                                            `Restart: ${serviceData.restart}`,
                                        ].filter(Boolean),
                                      }
                                    : getServiceInfo(service)
                                  return (
                                    <div
                                      key={service}
                                      className="flex items-center space-x-2 text-sm"
                                    >
                                      <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                                      <span className="text-zinc-700 dark:text-zinc-300">
                                        {getServiceDisplayName(service)}
                                      </span>
                                      <div className="group/tooltip relative isolate inline-flex">
                                        <svg
                                          className="h-4 w-4 flex-shrink-0 cursor-help text-zinc-400 dark:text-zinc-500"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                          />
                                        </svg>
                                        <div className="pointer-events-none invisible absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg bg-gray-900 p-3 text-xs text-white opacity-0 shadow-lg transition-all duration-200 group-hover/tooltip:visible group-hover/tooltip:opacity-100">
                                          <div className="mb-2 font-semibold">
                                            {info.description}
                                          </div>
                                          <div className="space-y-1 text-gray-300">
                                            {info.details.map((detail, i) => (
                                              <div key={i} className="text-xs">
                                                {detail}
                                              </div>
                                            ))}
                                          </div>
                                          <div className="absolute top-full left-2 h-0 w-0 border-t-4 border-r-4 border-l-4 border-transparent border-t-gray-900"></div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                },
                              )}
                            </div>
                          </div>
                        )}

                        {/* Custom Services */}
                        {(projectInfo.servicesByCategory?.user?.length ?? 0) > 0 && (
                          <div>
                            <div className="mb-2 flex items-center space-x-2">
                              <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                                Custom (
                                {projectInfo.servicesByCategory?.user?.length ?? 0})
                              </span>
                            </div>
                            <div className="ml-4 space-y-1">
                              {projectInfo.servicesByCategory?.user?.map(
                                (service: string, _idx: number) => {
                                  const serviceData = _serviceDetails?.[service]
                                  const info = serviceData
                                    ? {
                                        description: `Custom Service: ${service}`,
                                        details: [
                                          serviceData.container_name &&
                                            `Container: ${serviceData.container_name}`,
                                          serviceData.image &&
                                            `Image: ${serviceData.image}`,
                                          (serviceData.ports?.length ?? 0) > 0 &&
                                            `Ports: ${serviceData.ports?.map((p: string) => p.split(':')[0]).join(', ')}`,
                                          serviceData.customInfo?.type &&
                                            `Type: ${serviceData.customInfo.type}`,
                                          serviceData.customInfo?.route &&
                                            `Route: ${serviceData.customInfo.route}`,
                                          serviceData.restart &&
                                            `Restart: ${serviceData.restart}`,
                                        ].filter(Boolean),
                                      }
                                    : getServiceInfo(service)
                                  return (
                                    <div
                                      key={service}
                                      className="flex items-center space-x-2 text-sm"
                                    >
                                      <div className="h-1.5 w-1.5 rounded-full bg-orange-500"></div>
                                      <span className="text-zinc-700 dark:text-zinc-300">
                                        {getServiceDisplayName(service)}
                                      </span>
                                      <div className="group/tooltip relative isolate inline-flex">
                                        <svg
                                          className="h-4 w-4 flex-shrink-0 cursor-help text-zinc-400 dark:text-zinc-500"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                          />
                                        </svg>
                                        <div className="pointer-events-none invisible absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg bg-gray-900 p-3 text-xs text-white opacity-0 shadow-lg transition-all duration-200 group-hover/tooltip:visible group-hover/tooltip:opacity-100">
                                          <div className="mb-2 font-semibold">
                                            {info.description}
                                          </div>
                                          <div className="space-y-1 text-gray-300">
                                            {info.details.map((detail, i) => (
                                              <div key={i} className="text-xs">
                                                {detail}
                                              </div>
                                            ))}
                                          </div>
                                          <div className="absolute top-full left-2 h-0 w-0 border-t-4 border-r-4 border-l-4 border-transparent border-t-gray-900"></div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                },
                              )}
                            </div>
                          </div>
                        )}

                        {/* Frontend Apps */}
                        {projectInfo.frontendApps &&
                          projectInfo.frontendApps.length > 0 && (
                            <div>
                              <div className="mb-2 flex items-center space-x-2">
                                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                  Frontend Apps (
                                  {projectInfo.frontendApps.length})
                                </span>
                              </div>
                              <div className="ml-4 space-y-1">
                                {projectInfo.frontendApps.map((app: any) => (
                                  <div
                                    key={app.name}
                                    className="flex items-center space-x-2 text-sm"
                                  >
                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                                    <span className="text-zinc-700 dark:text-zinc-300">
                                      {app.label} (port {app.port})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Backup Status */}
                        {projectInfo.backupEnabled && (
                          <div>
                            <div className="mb-2 flex items-center space-x-2">
                              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                Backups
                              </span>
                            </div>
                            <div className="ml-4 space-y-1">
                              <div className="flex items-center space-x-2 text-sm">
                                <div className="h-1.5 w-1.5 rounded-full bg-gray-500"></div>
                                <span className="text-zinc-700 dark:text-zinc-300">
                                  Enabled
                                </span>
                                <div className="group/tooltip relative isolate inline-flex">
                                  <svg
                                    className="h-4 w-4 flex-shrink-0 cursor-help text-zinc-400 dark:text-zinc-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  <div className="pointer-events-none invisible absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg bg-gray-900 p-3 text-xs text-white opacity-0 shadow-lg transition-all duration-200 group-hover/tooltip:visible group-hover/tooltip:opacity-100">
                                    <div className="mb-2 font-semibold">
                                      Database Backups
                                    </div>
                                    <div className="space-y-1 text-gray-300">
                                      <div className="text-xs">
                                        Status: Enabled
                                      </div>
                                      <div className="text-xs">
                                        Schedule:{' '}
                                        {projectInfo.backupSchedule ||
                                          'Daily at 2AM'}
                                      </div>
                                      <div className="text-xs">
                                        Type: PostgreSQL dumps
                                      </div>
                                      <div className="text-xs">
                                        Retention: 7 days
                                      </div>
                                    </div>
                                    <div className="absolute top-full left-2 h-0 w-0 border-t-4 border-r-4 border-l-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="mt-6">
              <div className="flex flex-col items-center space-y-3">
                <Button
                  onClick={startServices}
                  variant="primary"
                  disabled={starting}
                  className="px-8 py-3 text-base font-semibold shadow-lg transition-shadow hover:shadow-xl"
                >
                  {starting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Starting Services...
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-2 h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Launch All Services
                    </>
                  )}
                </Button>

                {/* Only show description and options when NOT starting */}
                {!starting && (
                  <>
                    <p className="text-center text-xs leading-tight text-zinc-500 dark:text-zinc-500">
                      This will run{' '}
                      <span className="font-medium">nself start</span> which
                      uses Docker Compose
                      <br />
                      to launch all {projectInfo?.totalServices || 0} services
                      with smart defaults and auto-recovery.
                    </p>

                    {/* Edit/Reset Options */}
                    <div className="mt-4 flex items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                      <button
                        onClick={() => safeNavigate(router, '/init/1', true)}
                        className="rounded-lg px-4 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                      >
                        <svg
                          className="mr-1 inline h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit Build
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              'This will completely reset your project and delete all configuration. Are you sure?',
                            )
                          ) {
                            safeNavigate(router, '/init/reset', true) // Force navigation to reset
                          }
                        }}
                        className="rounded-lg px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <svg
                          className="mr-1 inline h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Reset Project
                      </button>
                    </div>
                  </>
                )}

                {/* Progress Message - Show when starting or has message */}
                {(starting || startProgress.message) && (
                  <div className="mt-4 max-w-md space-y-3 text-center">
                    <p
                      className={`text-sm font-medium ${
                        startProgress.type === 'error'
                          ? 'text-red-600 dark:text-red-400'
                          : startProgress.type === 'complete'
                            ? 'text-green-600 dark:text-green-400'
                            : startProgress.type === 'download'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {startProgress.message}
                    </p>

                    {/* Show instructions if present (for errors) */}
                    {startProgress.instructions &&
                      startProgress.instructions.length > 0 && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                          <div className="space-y-1 text-left">
                            {startProgress.instructions.map(
                              (instruction, index) => (
                                <div
                                  key={index}
                                  className="text-xs text-red-700 dark:text-red-300"
                                >
                                  {instruction}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {/* Progress Bar */}
                    {startProgress.percentage !== undefined &&
                      startProgress.percentage > 0 &&
                      startProgress.type !== 'error' && (
                        <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
                          <div
                            className="h-1.5 rounded-full bg-blue-600 transition-all duration-300 dark:bg-blue-400"
                            style={{ width: `${startProgress.percentage}%` }}
                          />
                        </div>
                      )}

                    {/* Retry button on error */}
                    {startProgress.type === 'error' && !starting && (
                      <button
                        onClick={() => {
                          setStartProgress({ message: '' })
                          startServices()
                        }}
                        className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Project Path Info */}
            {projectInfo?.projectPath && (
              <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                <div className="text-center text-xs text-zinc-400 dark:text-zinc-500">
                  <span className="font-medium">Project Path:</span>{' '}
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">
                    {projectInfo.projectPath}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
