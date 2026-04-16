'use client'

import { CardGridSkeleton } from '@/components/skeletons'
import type { CloudProvider, CloudServer } from '@/types/cloud'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Cloud,
  DollarSign,
  Globe,
  Plus,
  RefreshCw,
  Rocket,
  Server,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Metric Card Component with mouse tracking effect
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
  description?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function onMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <div
      onMouseMove={onMouseMove}
      className="group relative rounded-2xl bg-zinc-50/90 p-6 transition-colors duration-300 hover:bg-emerald-50/80 dark:bg-white/5 dark:hover:bg-emerald-950/40"
    >
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-200 to-emerald-100 opacity-0 transition duration-300 group-hover:opacity-100 dark:from-emerald-500/40 dark:to-emerald-400/30"
        style={{
          maskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
          WebkitMaskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
        }}
      />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/10 transition-colors duration-300 ring-inset group-hover:ring-emerald-500/50 dark:ring-white/20 dark:group-hover:ring-emerald-400/60" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {title}
          </h3>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 transition-colors duration-300 group-hover:bg-emerald-500/40 dark:bg-emerald-400/20 dark:group-hover:bg-emerald-400/40">
            <Icon className="h-4 w-4 text-emerald-600 group-hover:text-emerald-500 dark:text-emerald-400 dark:group-hover:text-emerald-300" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {value}
          </div>
          {percentage !== undefined && (
            <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300"
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

function CloudContent() {
  const [_refreshing, setRefreshing] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<{
    providers?: CloudProvider[]
    servers?: CloudServer[]
    monthlyCost?: number
  }>('/api/cloud/status', fetcher, {
    refreshInterval: 60000,
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    await mutate()
    setRefreshing(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Cloud Infrastructure
            </h1>
            <p className="text-sm text-zinc-400">
              Manage cloud providers and servers
            </p>
          </div>
        </div>
        <div className="grid animate-pulse grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-zinc-800/50" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Cloud Infrastructure
            </h1>
            <p className="text-sm text-zinc-400">
              Manage cloud providers and servers
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12">
          <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
          <p className="text-lg text-zinc-300">Failed to load cloud status</p>
          <button
            onClick={handleRefresh}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
        </div>
      </div>
    )
  }

  const providers = data?.providers || []
  const servers = data?.servers || []
  const configured = providers.filter((p) => p.configured).length
  const runningServers = servers.filter((s) => s.status === 'running').length
  const monthlyCost = data?.monthlyCost || 0

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="mt-12 mb-4">
        <h1 className="bg-gradient-to-r from-emerald-600 to-black bg-clip-text text-4xl/tight font-extrabold text-transparent sm:text-6xl/tight dark:from-emerald-400 dark:to-white">
          Cloud Infrastructure
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage cloud providers, servers, and deployment costs
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
        <Link
          href="/cloud/servers/create"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" /> Provision Server
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="mb-16">
        <div className="not-prose grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Configured Providers"
            value={`${configured} / 26`}
            percentage={(configured / 26) * 100}
            description="Cloud providers ready"
            icon={Cloud}
          />

          <MetricCard
            title="Active Servers"
            value={runningServers}
            percentage={
              servers.length > 0 ? (runningServers / servers.length) * 100 : 0
            }
            description={`${servers.length} total servers`}
            icon={Server}
          />

          <MetricCard
            title="Monthly Cost"
            value={`$${monthlyCost.toFixed(2)}`}
            percentage={50}
            description="Estimated monthly spend"
            icon={DollarSign}
          />

          <MetricCard
            title="Deployments"
            value={runningServers}
            percentage={100}
            description="Active deployments"
            icon={Activity}
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/cloud/providers"
          className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-emerald-500/50"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
            <Cloud className="h-5 w-5 text-emerald-400" />
          </div>
          <h3 className="mb-1 font-medium text-white">Providers</h3>
          <p className="text-sm text-zinc-400">
            Configure {26 - configured} more cloud providers
          </p>
        </Link>

        <Link
          href="/cloud/servers"
          className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-emerald-500/50"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
            <Server className="h-5 w-5 text-blue-400" />
          </div>
          <h3 className="mb-1 font-medium text-white">Servers</h3>
          <p className="text-sm text-zinc-400">
            Manage {servers.length} cloud servers
          </p>
        </Link>

        <Link
          href="/cloud/costs"
          className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-emerald-500/50"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
            <DollarSign className="h-5 w-5 text-amber-400" />
          </div>
          <h3 className="mb-1 font-medium text-white">Cost Comparison</h3>
          <p className="text-sm text-zinc-400">Compare provider pricing</p>
        </Link>

        <Link
          href="/cloud/deploy"
          className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-emerald-500/50"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20">
            <Rocket className="h-5 w-5 text-sky-400" />
          </div>
          <h3 className="mb-1 font-medium text-white">Quick Deploy</h3>
          <p className="text-sm text-zinc-400">One-click deployment flow</p>
        </Link>
      </div>

      {/* Recent Servers Table */}
      {servers.length > 0 && (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50">
          <div className="flex items-center justify-between border-b border-zinc-700/50 p-4">
            <h2 className="text-lg font-semibold text-white">Recent Servers</h2>
            <Link
              href="/cloud/servers"
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Server
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Region
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {servers.slice(0, 5).map((server) => (
                  <tr key={server.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Server className="h-4 w-4 text-zinc-500" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {server.name}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {server.size}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {server.provider}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-zinc-500" />
                        <span className="text-sm text-zinc-400">
                          {server.region}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          server.status === 'running'
                            ? 'bg-emerald-900/30 text-emerald-400'
                            : server.status === 'stopped'
                              ? 'bg-zinc-700 text-zinc-400'
                              : 'bg-amber-900/30 text-amber-400'
                        }`}
                      >
                        {server.status === 'running' && (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        {server.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-zinc-400">
                      {server.ip || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CloudPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <CloudContent />
    </Suspense>
  )
}
