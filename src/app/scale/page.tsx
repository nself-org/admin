'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import type { ScalingConfig } from '@/types/performance'
import {
  Activity,
  AlertTriangle,
  Cpu,
  Layers,
  MemoryStick,
  Minus,
  Plus,
  RefreshCw,
  Server,
  Settings,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

function ScaleContent() {
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<ScalingConfig[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchServices = useCallback(async () => {
    try {
      // Mock data - replace with real API
      const mockServices: ScalingConfig[] = [
        {
          service: 'PostgreSQL',
          current: { replicas: 1, cpu: '2', memory: '4Gi' },
          recommended: {
            replicas: 1,
            cpu: '4',
            memory: '8Gi',
            reason: 'High memory usage detected',
          },
          autoScaling: {
            enabled: false,
            minReplicas: 1,
            maxReplicas: 1,
            targetCPU: 80,
          },
        },
        {
          service: 'Hasura',
          current: { replicas: 2, cpu: '1', memory: '2Gi' },
          recommended: {
            replicas: 3,
            cpu: '1',
            memory: '2Gi',
            reason: 'Increased request volume',
          },
          autoScaling: {
            enabled: true,
            minReplicas: 2,
            maxReplicas: 5,
            targetCPU: 70,
            targetMemory: 80,
          },
        },
        {
          service: 'Auth Service',
          current: { replicas: 1, cpu: '0.5', memory: '512Mi' },
          autoScaling: {
            enabled: false,
            minReplicas: 1,
            maxReplicas: 3,
            targetCPU: 70,
          },
        },
        {
          service: 'Functions',
          current: { replicas: 2, cpu: '0.5', memory: '1Gi' },
          autoScaling: {
            enabled: true,
            minReplicas: 1,
            maxReplicas: 10,
            targetCPU: 60,
          },
        },
        {
          service: 'Redis',
          current: { replicas: 1, cpu: '0.5', memory: '1Gi' },
          autoScaling: {
            enabled: false,
            minReplicas: 1,
            maxReplicas: 1,
            targetCPU: 80,
          },
        },
        {
          service: 'MinIO',
          current: { replicas: 1, cpu: '1', memory: '2Gi' },
          autoScaling: {
            enabled: false,
            minReplicas: 1,
            maxReplicas: 1,
            targetCPU: 80,
          },
        },
      ]
      setServices(mockServices)
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const scaleService = async (serviceName: string, replicas: number) => {
    setActionLoading(`${serviceName}-scale`)
    try {
      await fetch('/api/scale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceName, replicas }),
      })
      await fetchServices()
    } finally {
      setActionLoading(null)
    }
  }

  const toggleAutoScaling = async (serviceName: string, enabled: boolean) => {
    setActionLoading(`${serviceName}-auto`)
    try {
      await fetch('/api/scale/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceName, enabled }),
      })
      await fetchServices()
    } finally {
      setActionLoading(null)
    }
  }

  const totalReplicas = services.reduce((acc, s) => acc + s.current.replicas, 0)
  const autoScalingEnabled = services.filter(
    (s) => s.autoScaling?.enabled,
  ).length
  const hasRecommendations = services.filter((s) => s.recommended).length

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-sky-400 dark:to-blue-300">
                Scaling
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Scale services and manage autoscaling configurations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/scale/auto"
                className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Settings className="h-4 w-4" />
                Autoscaling
              </Link>
              <button
                onClick={() => fetchServices()}
                className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <Server className="h-5 w-5 text-sky-500 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Services
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {services.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Replicas
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {totalReplicas}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Autoscaling Enabled
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {autoScalingEnabled}/{services.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Recommendations
                </p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {hasRecommendations}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Services List */}
        <div className="space-y-4">
          {services.map((service) => (
            <div
              key={service.service}
              className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-4 flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {service.service}
                    </h3>
                    {service.autoScaling?.enabled && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Autoscaling
                      </span>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                      <div className="mb-1 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          Replicas
                        </span>
                      </div>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white">
                        {service.current.replicas}
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                      <div className="mb-1 flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          CPU
                        </span>
                      </div>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white">
                        {service.current.cpu}
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                      <div className="mb-1 flex items-center gap-2">
                        <MemoryStick className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          Memory
                        </span>
                      </div>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white">
                        {service.current.memory}
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                      <div className="mb-1 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          Target CPU
                        </span>
                      </div>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white">
                        {service.autoScaling?.targetCPU || '-'}%
                      </p>
                    </div>
                  </div>

                  {service.recommended && (
                    <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        <p className="font-medium text-yellow-700 dark:text-yellow-300">
                          Recommendation: {service.recommended.reason}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                        Suggested: {service.recommended.replicas} replicas,{' '}
                        {service.recommended.cpu} CPU,{' '}
                        {service.recommended.memory} Memory
                      </p>
                    </div>
                  )}
                </div>

                <div className="ml-6 flex flex-col gap-3">
                  {/* Manual Scaling */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        scaleService(
                          service.service,
                          Math.max(0, service.current.replicas - 1),
                        )
                      }
                      disabled={
                        actionLoading !== null || service.current.replicas <= 0
                      }
                      className="rounded-lg border border-zinc-300 p-2 text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium text-zinc-900 dark:text-white">
                      {service.current.replicas}
                    </span>
                    <button
                      onClick={() =>
                        scaleService(
                          service.service,
                          service.current.replicas + 1,
                        )
                      }
                      disabled={actionLoading !== null}
                      className="rounded-lg border border-zinc-300 p-2 text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Autoscaling Toggle */}
                  <button
                    onClick={() =>
                      toggleAutoScaling(
                        service.service,
                        !service.autoScaling?.enabled,
                      )
                    }
                    disabled={actionLoading !== null}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      service.autoScaling?.enabled
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {service.autoScaling?.enabled ? 'Auto ON' : 'Auto OFF'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself scale</span> - Show
              scaling status
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself scale hasura --replicas=3
              </span>{' '}
              - Scale service
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself scale auto --enable</span>{' '}
              - Enable autoscaling
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself scale recommend</span> -
              Get scaling recommendations
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function ScalePage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <ScaleContent />
    </Suspense>
  )
}
