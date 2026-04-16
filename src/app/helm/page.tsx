'use client'

import { CardGridSkeleton } from '@/components/skeletons'
import type { HelmRelease } from '@/types/k8s'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  History,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Metric Card Component
function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  color = 'sky',
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  color?: 'sky' | 'emerald' | 'amber' | 'blue'
}) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const colorClasses = {
    sky: 'from-sky-500/40 to-sky-400/30 bg-sky-500/20 text-sky-400',
    emerald:
      'from-emerald-500/40 to-emerald-400/30 bg-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/40 to-amber-400/30 bg-amber-500/20 text-amber-400',
    blue: 'from-blue-500/40 to-blue-400/30 bg-blue-500/20 text-blue-400',
  }

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
      className="group relative rounded-2xl bg-zinc-50/90 p-6 transition-colors duration-300 hover:bg-sky-50/80 dark:bg-white/5 dark:hover:bg-sky-950/40"
    >
      <motion.div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${colorClasses[color].split(' ').slice(0, 2).join(' ')} opacity-0 transition duration-300 group-hover:opacity-100`}
        style={{
          maskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
          WebkitMaskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
        }}
      />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/10 transition-colors duration-300 ring-inset group-hover:ring-sky-500/50 dark:ring-white/20 dark:group-hover:ring-sky-400/60" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {title}
          </h3>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${colorClasses[color].split(' ').slice(2, 4).join(' ')}`}
          >
            <Icon className={`h-4 w-4 ${colorClasses[color].split(' ')[4]}`} />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {value}
          </div>
        </div>
        {description && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

// Mock releases
const mockReleases: HelmRelease[] = [
  {
    name: 'nself',
    namespace: 'default',
    revision: 5,
    status: 'deployed',
    chart: 'nself',
    chartVersion: '0.4.4',
    appVersion: '1.2.3',
    updatedAt: '2024-01-25T10:30:00Z',
    description: 'nself stack deployment',
  },
  {
    name: 'prometheus',
    namespace: 'monitoring',
    revision: 3,
    status: 'deployed',
    chart: 'prometheus',
    chartVersion: '25.8.0',
    appVersion: '2.48.0',
    updatedAt: '2024-01-20T14:00:00Z',
    description: 'Prometheus monitoring stack',
  },
  {
    name: 'grafana',
    namespace: 'monitoring',
    revision: 2,
    status: 'deployed',
    chart: 'grafana',
    chartVersion: '7.0.19',
    appVersion: '10.2.3',
    updatedAt: '2024-01-20T14:30:00Z',
    description: 'Grafana dashboards',
  },
  {
    name: 'cert-manager',
    namespace: 'cert-manager',
    revision: 1,
    status: 'deployed',
    chart: 'cert-manager',
    chartVersion: '1.13.3',
    appVersion: '1.13.3',
    updatedAt: '2024-01-15T09:00:00Z',
    description: 'Certificate management',
  },
  {
    name: 'ingress-nginx',
    namespace: 'ingress-nginx',
    revision: 4,
    status: 'deployed',
    chart: 'ingress-nginx',
    chartVersion: '4.9.0',
    appVersion: '1.9.5',
    updatedAt: '2024-01-18T11:00:00Z',
    description: 'NGINX Ingress Controller',
  },
]

const statusColors: Record<string, string> = {
  deployed: 'bg-emerald-900/30 text-emerald-400',
  'pending-install': 'bg-amber-900/30 text-amber-400',
  'pending-upgrade': 'bg-amber-900/30 text-amber-400',
  'pending-rollback': 'bg-amber-900/30 text-amber-400',
  failed: 'bg-red-900/30 text-red-400',
  uninstalling: 'bg-zinc-700 text-zinc-400',
}

function HelmContent() {
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, mutate } = useSWR<{ releases: HelmRelease[] }>(
    '/api/helm/releases',
    fetcher,
    { fallbackData: { releases: mockReleases }, refreshInterval: 30000 },
  )

  const releases = data?.releases || mockReleases

  const filteredReleases = releases.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.namespace.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.chart.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const deployedCount = releases.filter((r) => r.status === 'deployed').length
  const namespaces = [...new Set(releases.map((r) => r.namespace))]

  const handleUninstall = async (releaseName: string, namespace: string) => {
    if (!confirm(`Are you sure you want to uninstall "${releaseName}"?`)) {
      return
    }
    // Would call API
    await mutate()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Helm</h1>
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
        <div className="grid animate-pulse grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-zinc-800/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="mt-12 mb-4">
        <h1 className="bg-gradient-to-r from-sky-500 to-black bg-clip-text text-4xl/tight font-extrabold text-transparent sm:text-6xl/tight dark:from-sky-400 dark:to-white">
          Helm
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage Helm charts and releases
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-16">
        <div className="not-prose grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Releases"
            value={releases.length}
            description="Installed charts"
            icon={Package}
            color="sky"
          />

          <MetricCard
            title="Deployed"
            value={deployedCount}
            description="Running releases"
            icon={CheckCircle}
            color="emerald"
          />

          <MetricCard
            title="Namespaces"
            value={namespaces.length}
            description="Active namespaces"
            icon={Settings}
            color="blue"
          />

          <MetricCard
            title="Revisions"
            value={releases.reduce((acc, r) => acc + r.revision, 0)}
            description="Total upgrades"
            icon={History}
            color="amber"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/helm/init"
          className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-sky-500/50"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20">
            <Plus className="h-5 w-5 text-sky-400" />
          </div>
          <h3 className="mb-1 font-medium text-white">Initialize Chart</h3>
          <p className="text-sm text-zinc-400">Create a new Helm chart</p>
        </Link>

        <Link
          href="/helm/install"
          className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-sky-500/50"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
            <Package className="h-5 w-5 text-emerald-400" />
          </div>
          <h3 className="mb-1 font-medium text-white">Install Release</h3>
          <p className="text-sm text-zinc-400">Install a chart from repo</p>
        </Link>

        <Link
          href="/helm/values"
          className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-sky-500/50"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
            <Settings className="h-5 w-5 text-blue-400" />
          </div>
          <h3 className="mb-1 font-medium text-white">Values Editor</h3>
          <p className="text-sm text-zinc-400">Edit chart values</p>
        </Link>

        <Link
          href="/helm/repos"
          className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-sky-500/50"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
            <ExternalLink className="h-5 w-5 text-amber-400" />
          </div>
          <h3 className="mb-1 font-medium text-white">Repositories</h3>
          <p className="text-sm text-zinc-400">Manage chart repos</p>
        </Link>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search releases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <button
          onClick={() => mutate()}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Releases Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/50">
        <table className="w-full">
          <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Release
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Namespace
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Chart
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                App Version
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Revision
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Updated
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700/50">
            {filteredReleases.map((release) => (
              <tr
                key={`${release.namespace}-${release.name}`}
                className="hover:bg-zinc-800/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-sky-400" />
                    <span className="font-medium text-white">
                      {release.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-zinc-700/50 px-2 py-0.5 text-sm text-zinc-400">
                    {release.namespace}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <span className="text-white">{release.chart}</span>
                    <span className="ml-1 text-sm text-zinc-500">
                      v{release.chartVersion}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">
                  {release.appVersion}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">
                  {release.revision}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs capitalize ${
                      statusColors[release.status] || statusColors.deployed
                    }`}
                  >
                    {release.status === 'deployed' && (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    {release.status === 'failed' && (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {release.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">
                  {new Date(release.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/helm/values?release=${release.name}&namespace=${release.namespace}`}
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                      title="Edit values"
                    >
                      <Settings className="h-4 w-4" />
                    </Link>
                    {release.revision > 1 && (
                      <button
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                        title="Rollback"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                      title="History"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        handleUninstall(release.name, release.namespace)
                      }
                      className="rounded p-1.5 text-red-400 hover:bg-zinc-700"
                      title="Uninstall"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredReleases.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Package className="mb-4 h-12 w-12 text-zinc-500" />
            <p className="text-lg text-zinc-400">No releases found</p>
            <p className="text-sm text-zinc-500">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Install your first chart to get started'}
            </p>
            {!searchQuery && (
              <Link
                href="/helm/install"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm text-white hover:bg-sky-500"
              >
                <Plus className="h-4 w-4" />
                Install Chart
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function HelmPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <HelmContent />
    </Suspense>
  )
}
