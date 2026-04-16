'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import type { EnvironmentConfig, EnvironmentInfo } from '@/types/deployment'
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  Clock,
  GitBranch,
  Play,
  RefreshCw,
  Server,
  Settings,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface ServiceStatus {
  name: string
  status: 'running' | 'stopped' | 'error'
  version: string
  uptime: string
  cpu: number
  memory: number
}

function EnvironmentDetailContent() {
  const params = useParams()
  const envName = params.name as string

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null)
  const [config, setConfig] = useState<EnvironmentConfig | null>(null)
  const [services, setServices] = useState<ServiceStatus[]>([])

  const fetchEnvironment = useCallback(async () => {
    try {
      // Mock data - replace with real API
      setEnvironment({
        name: envName as any,
        status: 'active',
        url: envName !== 'local' ? `https://${envName}.example.com` : undefined,
        version: 'v1.3.0',
        lastDeployed: new Date(Date.now() - 3600000).toISOString(),
        deployedBy: 'developer@example.com',
        commit: 'a1b2c3d',
        branch: 'main',
        healthy: true,
        servicesRunning: 8,
        servicesTotal: 8,
      })

      setConfig({
        name: envName as any,
        variables: {
          NODE_ENV: envName === 'production' ? 'production' : 'development',
          DATABASE_URL: 'postgres://...',
          REDIS_URL: 'redis://...',
        },
        secrets: {
          JWT_SECRET: true,
          API_KEY: true,
          STRIPE_KEY: envName === 'production',
        },
        domain: envName !== 'local' ? `${envName}.example.com` : undefined,
      })

      setServices([
        {
          name: 'PostgreSQL',
          status: 'running',
          version: '15.2',
          uptime: '15d 6h',
          cpu: 8,
          memory: 25,
        },
        {
          name: 'Hasura',
          status: 'running',
          version: '2.33.0',
          uptime: '15d 6h',
          cpu: 15,
          memory: 38,
        },
        {
          name: 'Auth',
          status: 'running',
          version: '1.3.0',
          uptime: '15d 6h',
          cpu: 5,
          memory: 20,
        },
        {
          name: 'Redis',
          status: 'running',
          version: '7.2',
          uptime: '15d 6h',
          cpu: 2,
          memory: 15,
        },
        {
          name: 'MinIO',
          status: 'running',
          version: 'latest',
          uptime: '15d 6h',
          cpu: 3,
          memory: 22,
        },
        {
          name: 'Nginx',
          status: 'running',
          version: '1.24',
          uptime: '15d 6h',
          cpu: 1,
          memory: 5,
        },
      ])
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [envName])

  useEffect(() => {
    fetchEnvironment()
  }, [fetchEnvironment])

  const deployToEnvironment = async () => {
    setActionLoading('deploy')
    try {
      await fetch(`/api/deploy/${envName}`, { method: 'POST' })
      await fetchEnvironment()
    } finally {
      setActionLoading(null)
    }
  }

  const restartServices = async () => {
    setActionLoading('restart')
    try {
      await fetch(`/api/env/${envName}/restart`, { method: 'POST' })
      await fetchEnvironment()
    } finally {
      setActionLoading(null)
    }
  }

  const getEnvColor = (name: string) => {
    switch (name) {
      case 'local':
        return 'from-blue-600 to-cyan-400 dark:from-blue-400 dark:to-cyan-300'
      case 'development':
        return 'from-green-600 to-emerald-400 dark:from-green-400 dark:to-emerald-300'
      case 'staging':
        return 'from-yellow-600 to-orange-400 dark:from-yellow-400 dark:to-orange-300'
      case 'production':
        return 'from-red-600 to-pink-400 dark:from-red-400 dark:to-pink-300'
      default:
        return 'from-sky-500 to-blue-400 dark:from-sky-400 dark:to-blue-300'
    }
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <Link
            href="/environments"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Environments
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r ${getEnvColor(envName)}`}
              >
                <Server className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 capitalize dark:text-white">
                  {envName}
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {environment?.version} - {environment?.status}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={restartServices}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {actionLoading === 'restart' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Restart
              </button>
              {envName !== 'local' && (
                <button
                  onClick={deployToEnvironment}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
                >
                  {actionLoading === 'deploy' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Deploy
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Overview */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              {environment?.healthy ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Health
                </p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {environment?.healthy ? 'Healthy' : 'Unhealthy'}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Services
                </p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {environment?.servicesRunning}/{environment?.servicesTotal}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <GitBranch className="h-8 w-8 text-sky-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Branch
                </p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {environment?.branch || 'N/A'}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Last Deploy
                </p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {environment?.lastDeployed
                    ? new Date(environment.lastDeployed).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Services
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.name}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {service.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      service.status === 'running'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {service.status}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <div className="flex justify-between">
                    <span>Version</span>
                    <span>{service.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uptime</span>
                    <span>{service.uptime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CPU</span>
                    <span>{service.cpu}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory</span>
                    <span>{service.memory}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration */}
        {config && (
          <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Configuration
              </h3>
              <Link
                href={`/config?env=${envName}`}
                className="flex items-center gap-2 text-sm text-sky-500 hover:underline dark:text-sky-400"
              >
                <Settings className="h-4 w-4" />
                Edit Config
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Environment Variables
                </h4>
                <div className="space-y-2">
                  {Object.entries(config.variables).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded bg-zinc-50 px-3 py-2 dark:bg-zinc-900"
                    >
                      <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                        {key}
                      </span>
                      <span className="font-mono text-sm text-zinc-500">
                        {value.length > 20 ? `${value.slice(0, 20)}...` : value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Secrets
                </h4>
                <div className="space-y-2">
                  {Object.entries(config.secrets).map(([key, isSet]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded bg-zinc-50 px-3 py-2 dark:bg-zinc-900"
                    >
                      <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                        {key}
                      </span>
                      {isSet ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CLI Reference */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself env {envName}</span> -
              Show environment details
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself deploy {envName}</span> -
              Deploy to {envName}
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself logs {envName}</span> -
              View logs
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself config {envName} --edit
              </span>{' '}
              - Edit configuration
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function EnvironmentDetailPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <EnvironmentDetailContent />
    </Suspense>
  )
}
