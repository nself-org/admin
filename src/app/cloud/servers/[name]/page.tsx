'use client'

import { ServiceDetailSkeleton } from '@/components/skeletons'
import { useUrlState } from '@/hooks/useUrlState'
import type { CloudServer, ServerMetrics } from '@/types/cloud'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Copy,
  Cpu,
  ExternalLink,
  Globe,
  HardDrive,
  MemoryStick,
  Network,
  Play,
  RotateCcw,
  Server,
  Square,
  Terminal,
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
            <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {value}
          </div>
          {percentage !== undefined && (
            <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          )}
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

// Mock server data
const mockServer: CloudServer = {
  id: 'srv-1',
  name: 'prod-api-1',
  ip: '203.0.113.10',
  provider: 'digitalocean',
  region: 'nyc1',
  size: 'medium',
  status: 'running',
  createdAt: '2024-01-15T10:30:00Z',
  specs: { vcpu: 2, memory: '4 GB', storage: '80 GB SSD' },
  sshKeyName: 'deploy-key',
  tags: { environment: 'production', team: 'platform' },
}

const mockMetrics: ServerMetrics = {
  serverId: 'srv-1',
  cpu: 45,
  memory: {
    used: 2.8 * 1024 * 1024 * 1024,
    total: 4 * 1024 * 1024 * 1024,
    percentage: 70,
  },
  disk: {
    used: 32 * 1024 * 1024 * 1024,
    total: 80 * 1024 * 1024 * 1024,
    percentage: 40,
  },
  network: { bytesIn: 150 * 1024 * 1024, bytesOut: 85 * 1024 * 1024 },
  timestamp: new Date().toISOString(),
}

const statusColors: Record<string, string> = {
  running: 'bg-emerald-900/30 text-emerald-400',
  stopped: 'bg-zinc-700 text-zinc-400',
  starting: 'bg-amber-900/30 text-amber-400',
  stopping: 'bg-amber-900/30 text-amber-400',
  provisioning: 'bg-blue-900/30 text-blue-400',
  error: 'bg-red-900/30 text-red-400',
  unknown: 'bg-zinc-700 text-zinc-500',
}

function ServerDetailContent({ name }: { name: string }) {
  const serverName = name

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'overview')

  const {
    data: serverData,
    isLoading: serverLoading,
    mutate,
  } = useSWR<{ server: CloudServer }>(
    `/api/cloud/servers/${serverName}`,
    fetcher,
    { fallbackData: { server: mockServer } },
  )

  const { data: metricsData, isLoading: _metricsLoading } = useSWR<{
    metrics: ServerMetrics
  }>(`/api/cloud/servers/${serverName}/metrics`, fetcher, {
    fallbackData: { metrics: mockMetrics },
    refreshInterval: 30000,
  })

  const server = serverData?.server || mockServer
  const metrics = metricsData?.metrics || mockMetrics

  const handleAction = async (
    action: 'start' | 'stop' | 'restart' | 'delete',
  ) => {
    setActionLoading(action)
    try {
      await fetch(`/api/cloud/servers/${serverName}/${action}`, {
        method: 'POST',
      })
      await mutate()
    } catch (_error) {
      // Handle error
    } finally {
      setActionLoading(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (serverLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/cloud/servers"
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="animate-pulse">
            <div className="h-8 w-48 rounded bg-zinc-800" />
            <div className="mt-2 h-4 w-32 rounded bg-zinc-800" />
          </div>
        </div>
      </div>
    )
  }

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return gb >= 1
      ? `${gb.toFixed(1)} GB`
      : `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  }

  const formatUptime = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diff = now.getTime() - created.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    return `${days}d ${hours}h`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/cloud/servers"
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-700">
              <Server className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">
                {server.name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <span className="capitalize">{server.provider}</span>
                <span>|</span>
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {server.region}
                </span>
                <span>|</span>
                <span className="capitalize">{server.size}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${statusColors[server.status]}`}
          >
            {server.status === 'running' && (
              <CheckCircle className="mr-1 inline h-3 w-3" />
            )}
            {server.status === 'error' && (
              <AlertCircle className="mr-1 inline h-3 w-3" />
            )}
            {server.status}
          </span>

          {server.status === 'running' ? (
            <>
              <button
                onClick={() => handleAction('restart')}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Restart
              </button>
              <button
                onClick={() => handleAction('stop')}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-800 bg-amber-900/20 px-4 py-2 text-sm text-amber-400 hover:bg-amber-900/40 disabled:opacity-50"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            </>
          ) : server.status === 'stopped' ? (
            <button
              onClick={() => handleAction('start')}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Start
            </button>
          ) : null}

          <button
            onClick={() => handleAction('delete')}
            disabled={actionLoading !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 px-4 py-2 text-sm text-red-400 hover:bg-red-900/40 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-700">
        <div className="flex gap-4">
          {(['overview', 'metrics', 'logs', 'console'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Server Info */}
          <div className="space-y-6 lg:col-span-2">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetricCard
                title="CPU Usage"
                value={`${metrics.cpu}%`}
                percentage={metrics.cpu}
                icon={Cpu}
              />
              <MetricCard
                title="Memory"
                value={formatBytes(metrics.memory.used)}
                percentage={metrics.memory.percentage}
                description={`of ${formatBytes(metrics.memory.total)}`}
                icon={MemoryStick}
              />
              <MetricCard
                title="Disk"
                value={formatBytes(metrics.disk.used)}
                percentage={metrics.disk.percentage}
                description={`of ${formatBytes(metrics.disk.total)}`}
                icon={HardDrive}
              />
              <MetricCard
                title="Network"
                value={formatBytes(
                  metrics.network.bytesIn + metrics.network.bytesOut,
                )}
                description="In + Out"
                icon={Network}
              />
            </div>

            {/* Connection Info */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <h3 className="mb-4 text-lg font-semibold text-white">
                Connection
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">IP Address</span>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-zinc-700/50 px-3 py-1 font-mono text-emerald-400">
                      {server.ip || 'Pending...'}
                    </code>
                    {server.ip && (
                      <button
                        onClick={() => copyToClipboard(server.ip)}
                        className="text-zinc-500 hover:text-white"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">SSH Command</span>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-zinc-700/50 px-3 py-1 font-mono text-sm text-zinc-300">
                      ssh root@{server.ip || 'pending'}
                    </code>
                    <button
                      onClick={() => copyToClipboard(`ssh root@${server.ip}`)}
                      className="text-zinc-500 hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            {server.tags && Object.keys(server.tags).length > 0 && (
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
                <h3 className="mb-4 text-lg font-semibold text-white">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(server.tags).map(([key, value]) => (
                    <span
                      key={key}
                      className="rounded bg-zinc-700/50 px-3 py-1 text-sm text-zinc-300"
                    >
                      {key}: {value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Server Details */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <h3 className="mb-4 font-medium text-white">Server Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Provider</span>
                  <span className="text-white capitalize">
                    {server.provider}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Region</span>
                  <span className="text-white">{server.region}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Size</span>
                  <span className="text-white capitalize">{server.size}</span>
                </div>
                {server.specs && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">vCPU</span>
                      <span className="text-white">{server.specs.vcpu}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Memory</span>
                      <span className="text-white">{server.specs.memory}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Storage</span>
                      <span className="text-white">{server.specs.storage}</span>
                    </div>
                  </>
                )}
                {server.sshKeyName && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">SSH Key</span>
                    <span className="text-white">{server.sshKeyName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Created</span>
                  <span className="text-white">
                    {new Date(server.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Uptime</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Clock className="h-3 w-3" />
                    {formatUptime(server.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <h3 className="mb-4 font-medium text-white">Quick Actions</h3>
              <div className="space-y-2">
                <button className="flex w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700">
                  <Terminal className="h-4 w-4" />
                  Open Console
                </button>
                <button className="flex w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700">
                  <Activity className="h-4 w-4" />
                  View Metrics
                </button>
                <a
                  href={`https://${server.provider}.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  Provider Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12 text-center">
          <Activity className="mx-auto mb-4 h-12 w-12 text-zinc-500" />
          <p className="text-lg text-zinc-400">Detailed metrics coming soon</p>
          <p className="text-sm text-zinc-500">
            Real-time CPU, memory, disk, and network graphs
          </p>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12 text-center">
          <Terminal className="mx-auto mb-4 h-12 w-12 text-zinc-500" />
          <p className="text-lg text-zinc-400">Server logs coming soon</p>
          <p className="text-sm text-zinc-500">
            View system logs and application output
          </p>
        </div>
      )}

      {activeTab === 'console' && (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12 text-center">
          <Terminal className="mx-auto mb-4 h-12 w-12 text-zinc-500" />
          <p className="text-lg text-zinc-400">Web console coming soon</p>
          <p className="text-sm text-zinc-500">
            Access your server directly from the browser
          </p>
        </div>
      )}
    </div>
  )
}

export default async function ServerDetailPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <ServerDetailContent name={name} />
    </Suspense>
  )
}
