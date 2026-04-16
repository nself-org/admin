'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { CardGridSkeleton } from '@/components/skeletons'
import type { FrontendApp } from '@/types/deployment'
import {
  Activity,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Globe,
  Layers,
  Plus,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

function FrontendContent() {
  const [loading, setLoading] = useState(true)
  const [apps, setApps] = useState<FrontendApp[]>([])

  const fetchApps = useCallback(async () => {
    try {
      // Mock data - replace with real API
      const mockApps: FrontendApp[] = [
        {
          id: 'app-1',
          name: 'main-website',
          framework: 'Next.js',
          status: 'running',
          url: 'https://example.com',
          branch: 'main',
          lastDeployed: new Date(Date.now() - 3600000).toISOString(),
          buildTime: 45,
          metrics: {
            requests: 15000,
            latency: 120,
            errors: 5,
          },
        },
        {
          id: 'app-2',
          name: 'admin-dashboard',
          framework: 'React',
          status: 'running',
          url: 'https://admin.example.com',
          branch: 'main',
          lastDeployed: new Date(Date.now() - 86400000).toISOString(),
          buildTime: 32,
          metrics: {
            requests: 2500,
            latency: 85,
            errors: 0,
          },
        },
        {
          id: 'app-3',
          name: 'docs-site',
          framework: 'Astro',
          status: 'running',
          url: 'https://docs.example.com',
          branch: 'main',
          lastDeployed: new Date(Date.now() - 172800000).toISOString(),
          buildTime: 18,
          metrics: {
            requests: 8500,
            latency: 45,
            errors: 2,
          },
        },
        {
          id: 'app-4',
          name: 'mobile-app',
          framework: 'React Native Web',
          status: 'building',
          branch: 'feature/new-ui',
          buildTime: 0,
        },
      ]
      setApps(mockApps)
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApps()
  }, [fetchApps])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'building':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'stopped':
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
    }
  }

  const getFrameworkIcon = (framework: string) => {
    switch (framework.toLowerCase()) {
      case 'next.js':
        return <Zap className="h-5 w-5 text-black dark:text-white" />
      case 'react':
        return <Activity className="h-5 w-5 text-blue-500" />
      case 'astro':
        return <Globe className="h-5 w-5 text-sky-500" />
      default:
        return <Layers className="h-5 w-5 text-zinc-500" />
    }
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
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
              <h1 className="bg-gradient-to-r from-cyan-600 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-cyan-400 dark:to-blue-300">
                Frontend Apps
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Manage your frontend applications and deployments
              </p>
            </div>
            <Link
              href="/frontend/add"
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
            >
              <Plus className="h-4 w-4" />
              Add App
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Layers className="h-8 w-8 text-cyan-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Apps
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {apps.length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Running
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {apps.filter((a) => a.status === 'running').length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Requests
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {apps
                    .reduce((acc, app) => acc + (app.metrics?.requests || 0), 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Avg Latency
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {Math.round(
                    apps
                      .filter((a) => a.metrics?.latency)
                      .reduce(
                        (acc, app) => acc + (app.metrics?.latency || 0),
                        0,
                      ) / apps.filter((a) => a.metrics?.latency).length || 0,
                  )}
                  ms
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* App List */}
        <div className="grid gap-6 md:grid-cols-2">
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/frontend/${app.name}`}
              className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-cyan-500 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-cyan-500"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700">
                    {getFrameworkIcon(app.framework || '')}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {app.name}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {app.framework}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-400 transition-transform group-hover:translate-x-1" />
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(app.status)}`}
                >
                  {app.status}
                </span>
                <span className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <GitBranch className="h-3 w-3" />
                  {app.branch}
                </span>
              </div>

              {app.url && (
                <div className="mb-4 flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400">
                  <ExternalLink className="h-4 w-4" />
                  {app.url.replace('https://', '')}
                </div>
              )}

              {app.metrics && (
                <div className="grid grid-cols-3 gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-700">
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Requests
                    </p>
                    <p className="font-semibold text-zinc-900 dark:text-white">
                      {app.metrics.requests.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Latency
                    </p>
                    <p className="font-semibold text-zinc-900 dark:text-white">
                      {app.metrics.latency}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Errors
                    </p>
                    <p
                      className={`font-semibold ${app.metrics.errors > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}
                    >
                      {app.metrics.errors}
                    </p>
                  </div>
                </div>
              )}

              {app.status === 'building' && (
                <div className="flex items-center gap-2 border-t border-zinc-100 pt-4 text-sm text-blue-600 dark:border-zinc-700 dark:text-blue-400">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Building...
                </div>
              )}

              {app.lastDeployed && (
                <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                  Last deployed:{' '}
                  {new Date(app.lastDeployed).toLocaleDateString()}
                  {app.buildTime && ` (${app.buildTime}s build)`}
                </p>
              )}
            </Link>
          ))}
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-cyan-500">nself frontend</span> - List
              frontend apps
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-cyan-500">nself frontend add</span> - Add
              new frontend app
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-cyan-500">
                nself frontend deploy main-website
              </span>{' '}
              - Deploy specific app
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-cyan-500">
                nself frontend logs main-website
              </span>{' '}
              - View app logs
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function FrontendPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <FrontendContent />
    </Suspense>
  )
}
