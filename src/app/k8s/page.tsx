'use client'

import { CardGridSkeleton } from '@/components/skeletons'
import type { K8sCluster, K8sDeployment, K8sPod } from '@/types/k8s'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  Box,
  CheckCircle,
  FolderTree,
  Layers,
  Plus,
  RefreshCw,
  Scale,
  Server,
  Settings,
  Terminal,
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
  color = 'blue',
}: {
  title: string
  value: string | number
  percentage?: number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  color?: 'blue' | 'emerald' | 'amber' | 'sky'
}) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const colorClasses = {
    blue: 'from-blue-500/40 to-blue-400/30 ring-blue-400/60 bg-blue-500/20 text-blue-400',
    emerald:
      'from-emerald-500/40 to-emerald-400/30 ring-emerald-400/60 bg-emerald-500/20 text-emerald-400',
    amber:
      'from-amber-500/40 to-amber-400/30 ring-amber-400/60 bg-amber-500/20 text-amber-400',
    sky:
      'from-sky-500/40 to-sky-400/30 ring-sky-400/60 bg-sky-500/20 text-sky-400',
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
      className="group relative rounded-2xl bg-zinc-50/90 p-6 transition-colors duration-300 hover:bg-blue-50/80 dark:bg-white/5 dark:hover:bg-blue-950/40"
    >
      <motion.div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${colorClasses[color].split(' ').slice(0, 2).join(' ')} opacity-0 transition duration-300 group-hover:opacity-100`}
        style={{
          maskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
          WebkitMaskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
        }}
      />
      <div
        className={`absolute inset-0 rounded-2xl ring-1 ring-zinc-900/10 transition-colors duration-300 ring-inset group-hover:${colorClasses[color].split(' ')[2]} dark:ring-white/20`}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {title}
          </h3>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${colorClasses[color].split(' ').slice(3, 5).join(' ')}`}
          >
            <Icon className={`h-4 w-4 ${colorClasses[color].split(' ')[5]}`} />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {value}
          </div>
          {percentage !== undefined && (
            <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className={`h-2 rounded-full bg-gradient-to-r ${colorClasses[color].split(' ').slice(0, 2).join(' ')}`}
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

// Mock data
const mockCluster: K8sCluster = {
  name: 'production',
  context: 'do-nyc1-production',
  platform: 'doks',
  apiServer: 'https://k8s.example.com:6443',
  namespace: 'default',
  status: 'connected',
  version: '1.28.2',
  nodes: 3,
  current: true,
}

const mockDeployments: K8sDeployment[] = [
  {
    name: 'nself-api',
    namespace: 'default',
    replicas: { desired: 3, ready: 3, available: 3, updated: 3 },
    strategy: 'RollingUpdate',
    image: 'nself/api:v1.2.3',
    createdAt: '2024-01-15T10:30:00Z',
    conditions: [
      {
        type: 'Available',
        status: 'True',
        lastTransitionTime: '2024-01-15T10:30:00Z',
      },
    ],
  },
  {
    name: 'nself-hasura',
    namespace: 'default',
    replicas: { desired: 2, ready: 2, available: 2, updated: 2 },
    strategy: 'RollingUpdate',
    image: 'hasura/graphql-engine:v2.35.0',
    createdAt: '2024-01-15T10:30:00Z',
    conditions: [
      {
        type: 'Available',
        status: 'True',
        lastTransitionTime: '2024-01-15T10:30:00Z',
      },
    ],
  },
  {
    name: 'nself-auth',
    namespace: 'default',
    replicas: { desired: 2, ready: 2, available: 2, updated: 2 },
    strategy: 'RollingUpdate',
    image: 'nself/auth:v1.0.0',
    createdAt: '2024-01-15T10:30:00Z',
    conditions: [
      {
        type: 'Available',
        status: 'True',
        lastTransitionTime: '2024-01-15T10:30:00Z',
      },
    ],
  },
]

const mockPods: K8sPod[] = [
  {
    name: 'nself-api-7d9f8b6c5-abc12',
    namespace: 'default',
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    age: '2d',
    containers: [],
  },
  {
    name: 'nself-api-7d9f8b6c5-def34',
    namespace: 'default',
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    age: '2d',
    containers: [],
  },
  {
    name: 'nself-api-7d9f8b6c5-ghi56',
    namespace: 'default',
    status: 'Running',
    ready: '1/1',
    restarts: 1,
    age: '2d',
    containers: [],
  },
  {
    name: 'nself-hasura-5c4d3b2a1-jkl78',
    namespace: 'default',
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    age: '2d',
    containers: [],
  },
  {
    name: 'nself-hasura-5c4d3b2a1-mno90',
    namespace: 'default',
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    age: '2d',
    containers: [],
  },
  {
    name: 'nself-auth-6e5f4g3h2-pqr12',
    namespace: 'default',
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    age: '2d',
    containers: [],
  },
  {
    name: 'nself-auth-6e5f4g3h2-stu34',
    namespace: 'default',
    status: 'Pending',
    ready: '0/1',
    restarts: 0,
    age: '5m',
    containers: [],
  },
]

function K8sContent() {
  const [_refreshing, setRefreshing] = useState(false)

  const {
    data,
    error: _error,
    isLoading,
    mutate,
  } = useSWR<{
    cluster?: K8sCluster
    deployments?: K8sDeployment[]
    pods?: K8sPod[]
  }>('/api/k8s/status', fetcher, {
    fallbackData: {
      cluster: mockCluster,
      deployments: mockDeployments,
      pods: mockPods,
    },
    refreshInterval: 30000,
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    await mutate()
    setRefreshing(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Kubernetes</h1>
          <p className="text-sm text-zinc-400">Manage Kubernetes deployments</p>
        </div>
        <div className="grid animate-pulse grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-zinc-800/50" />
          ))}
        </div>
      </div>
    )
  }

  const cluster = data?.cluster || mockCluster
  const deployments = data?.deployments || mockDeployments
  const pods = data?.pods || mockPods

  const runningPods = pods.filter((p) => p.status === 'Running').length
  const totalReplicas = deployments.reduce(
    (acc, d) => acc + d.replicas.desired,
    0,
  )
  const readyReplicas = deployments.reduce(
    (acc, d) => acc + d.replicas.ready,
    0,
  )

  const statusColors: Record<string, string> = {
    Running: 'bg-emerald-900/30 text-emerald-400',
    Pending: 'bg-amber-900/30 text-amber-400',
    Failed: 'bg-red-900/30 text-red-400',
    Succeeded: 'bg-blue-900/30 text-blue-400',
    Unknown: 'bg-zinc-700 text-zinc-400',
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="mt-12 mb-4">
        <h1 className="bg-gradient-to-r from-blue-600 to-black bg-clip-text text-4xl/tight font-extrabold text-transparent sm:text-6xl/tight dark:from-blue-400 dark:to-white">
          Kubernetes
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage Kubernetes clusters, deployments, and pods
        </p>
      </div>

      {/* Cluster Status Banner */}
      {cluster ? (
        <div className="flex items-center justify-between rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                cluster.status === 'connected'
                  ? 'bg-emerald-500/20'
                  : 'bg-red-500/20'
              }`}
            >
              <Box
                className={`h-5 w-5 ${
                  cluster.status === 'connected'
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-white">{cluster.name}</h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                    cluster.status === 'connected'
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {cluster.status === 'connected' && (
                    <CheckCircle className="h-3 w-3" />
                  )}
                  {cluster.status}
                </span>
              </div>
              <p className="text-sm text-zinc-400">
                {cluster.platform.toUpperCase()} | v{cluster.version} |{' '}
                {cluster.nodes} nodes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link
              href="/k8s/clusters"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              <Settings className="h-4 w-4" />
              Clusters
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-amber-400" />
          <p className="text-lg text-zinc-300">
            No Kubernetes cluster connected
          </p>
          <p className="text-sm text-zinc-500">
            Connect to a cluster or set up a new one
          </p>
          <Link
            href="/k8s/setup"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Setup Kubernetes
          </Link>
        </div>
      )}

      {cluster && (
        <>
          {/* Stats Cards */}
          <div className="mb-16">
            <div className="not-prose grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Deployments"
                value={deployments.length}
                description="Active deployments"
                icon={Layers}
                color="blue"
              />

              <MetricCard
                title="Pods"
                value={`${runningPods}/${pods.length}`}
                percentage={(runningPods / pods.length) * 100}
                description="Running pods"
                icon={Box}
                color="emerald"
              />

              <MetricCard
                title="Replicas"
                value={`${readyReplicas}/${totalReplicas}`}
                percentage={(readyReplicas / totalReplicas) * 100}
                description="Ready replicas"
                icon={Scale}
                color="sky"
              />

              <MetricCard
                title="Cluster Health"
                value={cluster.status === 'connected' ? 'Healthy' : 'Unhealthy'}
                percentage={cluster.status === 'connected' ? 100 : 0}
                description={`${cluster.nodes} nodes available`}
                icon={Activity}
                color="amber"
              />
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/k8s/setup"
              className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-blue-500/50"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <Settings className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="mb-1 font-medium text-white">Setup</h3>
              <p className="text-sm text-zinc-400">Initialize K8s manifests</p>
            </Link>

            <Link
              href="/k8s/convert"
              className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-blue-500/50"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <FolderTree className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="mb-1 font-medium text-white">Convert</h3>
              <p className="text-sm text-zinc-400">Docker Compose to K8s</p>
            </Link>

            <Link
              href="/k8s/deploy"
              className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-blue-500/50"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20">
                <Server className="h-5 w-5 text-sky-400" />
              </div>
              <h3 className="mb-1 font-medium text-white">Deploy</h3>
              <p className="text-sm text-zinc-400">Deploy to cluster</p>
            </Link>

            <Link
              href="/k8s/logs"
              className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 transition-colors hover:border-blue-500/50"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                <Terminal className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="mb-1 font-medium text-white">Logs</h3>
              <p className="text-sm text-zinc-400">View pod logs</p>
            </Link>
          </div>

          {/* Deployments Table */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50">
            <div className="flex items-center justify-between border-b border-zinc-700/50 p-4">
              <h2 className="text-lg font-semibold text-white">Deployments</h2>
              <Link
                href="/k8s/status"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                      Image
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                      Replicas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700/50">
                  {deployments.map((deployment) => (
                    <tr key={deployment.name} className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Layers className="h-4 w-4 text-zinc-500" />
                          <span className="font-medium text-white">
                            {deployment.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-zinc-700/50 px-2 py-0.5 text-sm text-zinc-300">
                          {deployment.image}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-zinc-400">
                          {deployment.replicas.ready}/
                          {deployment.replicas.desired}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            deployment.replicas.ready ===
                            deployment.replicas.desired
                              ? 'bg-emerald-900/30 text-emerald-400'
                              : 'bg-amber-900/30 text-amber-400'
                          }`}
                        >
                          {deployment.replicas.ready ===
                          deployment.replicas.desired ? (
                            <>
                              <CheckCircle className="h-3 w-3" /> Ready
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3" /> Updating
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pods Table */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50">
            <div className="flex items-center justify-between border-b border-zinc-700/50 p-4">
              <h2 className="text-lg font-semibold text-white">Pods</h2>
              <Link
                href="/k8s/status"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                      Ready
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                      Restarts
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                      Age
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700/50">
                  {pods.slice(0, 5).map((pod) => (
                    <tr key={pod.name} className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Box className="h-4 w-4 text-zinc-500" />
                          <span className="font-mono text-sm text-white">
                            {pod.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {pod.ready}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                            statusColors[pod.status] || statusColors.Unknown
                          }`}
                        >
                          {pod.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {pod.restarts}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {pod.age}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function K8sPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <K8sContent />
    </Suspense>
  )
}
