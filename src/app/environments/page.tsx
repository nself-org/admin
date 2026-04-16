'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { CardGridSkeleton } from '@/components/skeletons'
import type { EnvironmentInfo } from '@/types/deployment'
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Plus,
  Server,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

function EnvironmentsContent() {
  const [loading, setLoading] = useState(true)
  const [environments, setEnvironments] = useState<EnvironmentInfo[]>([])

  const fetchEnvironments = useCallback(async () => {
    try {
      // Mock data - replace with real API
      const mockEnvironments: EnvironmentInfo[] = [
        {
          name: 'local',
          status: 'active',
          version: 'v1.3.0-dev',
          healthy: true,
          servicesRunning: 8,
          servicesTotal: 8,
        },
        {
          name: 'development',
          status: 'active',
          url: 'https://dev.example.com',
          version: 'v1.3.0-beta.2',
          lastDeployed: new Date(Date.now() - 3600000).toISOString(),
          deployedBy: 'developer@example.com',
          commit: 'a1b2c3d',
          branch: 'develop',
          healthy: true,
          servicesRunning: 8,
          servicesTotal: 8,
        },
        {
          name: 'staging',
          status: 'active',
          url: 'https://staging.example.com',
          version: 'v1.2.5',
          lastDeployed: new Date(Date.now() - 86400000).toISOString(),
          deployedBy: 'developer@example.com',
          commit: 'e4f5g6h',
          branch: 'main',
          healthy: true,
          servicesRunning: 7,
          servicesTotal: 8,
        },
        {
          name: 'production',
          status: 'active',
          url: 'https://example.com',
          version: 'v1.2.4',
          lastDeployed: new Date(Date.now() - 86400000 * 3).toISOString(),
          deployedBy: 'admin@example.com',
          commit: 'i7j8k9l',
          branch: 'main',
          healthy: true,
          servicesRunning: 8,
          servicesTotal: 8,
        },
      ]
      setEnvironments(mockEnvironments)
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEnvironments()
  }, [fetchEnvironments])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'deploying':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'inactive':
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
      case 'error':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-sky-400 dark:to-pink-300">
                Environments
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Manage deployment environments and configurations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/environments/diff"
                className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <GitBranch className="h-4 w-4" />
                Compare
              </Link>
            </div>
          </div>
        </div>

        {/* Environment Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {environments.map((env) => (
            <Link
              key={env.name}
              href={`/environments/${env.name}`}
              className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-sky-500 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-sky-500"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r ${getEnvColor(env.name)}`}
                  >
                    <Server className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 capitalize dark:text-white">
                      {env.name}
                    </h3>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(env.status)}`}
                    >
                      {env.status}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-400 transition-transform group-hover:translate-x-1" />
              </div>

              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Version
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {env.version || 'N/A'}
                  </span>
                </div>
                {env.url && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      URL
                    </span>
                    <span className="flex items-center gap-1 font-medium text-sky-500 dark:text-sky-400">
                      {env.url.replace('https://', '')}
                      <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                )}
                {env.branch && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Branch
                    </span>
                    <span className="flex items-center gap-1 font-medium text-zinc-900 dark:text-white">
                      <GitBranch className="h-3 w-3" />
                      {env.branch}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-700">
                <div className="flex items-center gap-2">
                  {env.healthy ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {env.servicesRunning}/{env.servicesTotal} services
                  </span>
                </div>
                {env.lastDeployed && (
                  <span className="text-xs text-zinc-500">
                    {new Date(env.lastDeployed).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Link
            href="/deploy/preview"
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-sky-500 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-sky-500 dark:hover:bg-sky-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <Plus className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">
                Preview Environments
              </p>
              <p className="text-sm text-zinc-500">Branch testing</p>
            </div>
          </Link>

          <Link
            href="/deploy/canary"
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-sky-500 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-sky-500 dark:hover:bg-sky-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <ArrowRight className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">
                Canary Deploy
              </p>
              <p className="text-sm text-zinc-500">Gradual rollout</p>
            </div>
          </Link>

          <Link
            href="/deploy/blue-green"
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-sky-500 hover:bg-sky-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-sky-500 dark:hover:bg-sky-900/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">
                Blue-Green
              </p>
              <p className="text-sm text-zinc-500">Zero-downtime deploy</p>
            </div>
          </Link>
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself env</span> - List
              environments
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself env staging</span> - Show
              staging details
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself env diff staging prod</span>{' '}
              - Compare environments
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself deploy staging</span> -
              Deploy to staging
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function EnvironmentsPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <EnvironmentsContent />
    </Suspense>
  )
}
