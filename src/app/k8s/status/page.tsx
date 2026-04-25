'use client'

import { ChartSkeleton } from '@/components/skeletons'
import { useUrlState } from '@/hooks/useUrlState'
import type { K8sDeployment, K8sPod } from '@/types/k8s'
import {
  AlertCircle,
  ArrowLeft,
  Box,
  CheckCircle,
  Layers,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Terminal,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Mock data
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
    replicas: { desired: 2, ready: 1, available: 1, updated: 2 },
    strategy: 'RollingUpdate',
    image: 'nself/auth:v1.0.0',
    createdAt: '2024-01-15T10:30:00Z',
    conditions: [
      {
        type: 'Progressing',
        status: 'True',
        lastTransitionTime: '2024-01-15T10:30:00Z',
      },
    ],
  },
  {
    name: 'nself-nginx',
    namespace: 'default',
    replicas: { desired: 2, ready: 2, available: 2, updated: 2 },
    strategy: 'RollingUpdate',
    image: 'nginx:1.25-alpine',
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
    ip: '10.0.1.10',
    node: 'node-1',
    containers: [],
  },
  {
    name: 'nself-api-7d9f8b6c5-def34',
    namespace: 'default',
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    age: '2d',
    ip: '10.0.1.11',
    node: 'node-2',
    containers: [],
  },
  {
    name: 'nself-api-7d9f8b6c5-ghi56',
    namespace: 'default',
    status: 'Running',
    ready: '1/1',
    restarts: 1,
    age: '2d',
    ip: '10.0.1.12',
    node: 'node-3',
    containers: [],
  },
  {
    name: 'nself-hasura-5c4d3b2a1-jkl78',
    namespace: 'default',
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    age: '2d',
    ip: '10.0.2.10',
    node: 'node-1',
    containers: [],
  },
  {
    name: 'nself-hasura-5c4d3b2a1-mno90',
    namespace: 'default',
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    age: '2d',
    ip: '10.0.2.11',
    node: 'node-2',
    containers: [],
  },
  {
    name: 'nself-auth-6e5f4g3h2-pqr12',
    namespace: 'default',
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    age: '2d',
    ip: '10.0.3.10',
    node: 'node-1',
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
  {
    name: 'nself-nginx-8h9i0j1k2-vwx56',
    namespace: 'default',
    status: 'Running',
    ready: '1/1',
    restarts: 0,
    age: '2d',
    ip: '10.0.4.10',
    node: 'node-2',
    containers: [],
  },
  {
    name: 'nself-nginx-8h9i0j1k2-yza78',
    namespace: 'default',
    status: 'Running',
    ready: '1/1',
    restarts: 2,
    age: '2d',
    ip: '10.0.4.11',
    node: 'node-3',
    containers: [],
  },
]

const statusColors: Record<string, string> = {
  Running: 'bg-emerald-900/30 text-emerald-400',
  Pending: 'bg-amber-900/30 text-amber-400',
  Failed: 'bg-red-900/30 text-red-400',
  Succeeded: 'bg-blue-900/30 text-blue-400',
  Unknown: 'bg-zinc-700 text-zinc-400',
}

function K8sStatusContent() {
  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'deployments')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(
    null,
  )

  const { data, isLoading, mutate } = useSWR<{
    deployments: K8sDeployment[]
    pods: K8sPod[]
  }>('/api/k8s/status', fetcher, {
    fallbackData: { deployments: mockDeployments, pods: mockPods },
    refreshInterval: 10000,
  })

  const deployments = data?.deployments || mockDeployments
  const pods = data?.pods || mockPods

  const filteredDeployments = deployments.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredPods = selectedDeployment
    ? pods.filter((p) => p.name.startsWith(selectedDeployment))
    : pods.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )

  const handleAction = async (
    _action: 'restart' | 'scale' | 'delete',
    _name: string,
  ) => {
    // Would call API
    await mutate()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">K8s Status</h1>
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-zinc-800/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/k8s"
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Deployment Status
            </h1>
            <p className="text-sm text-zinc-400">
              {deployments.length} deployments, {pods.length} pods
            </p>
          </div>
        </div>

        <button
          onClick={() => mutate()}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Search and Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('deployments')
              setSelectedDeployment(null)
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === 'deployments'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="mr-2 inline h-4 w-4" />
            Deployments ({deployments.length})
          </button>
          <button
            onClick={() => setActiveTab('pods')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === 'pods'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Box className="mr-2 inline h-4 w-4" />
            Pods ({pods.length})
          </button>
        </div>

        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Deployments Table */}
      {activeTab === 'deployments' && (
        <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/50">
          <table className="w-full">
            <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  Deployment
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
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                  Strategy
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700/50">
              {filteredDeployments.map((deployment) => {
                const isHealthy =
                  deployment.replicas.ready === deployment.replicas.desired
                return (
                  <tr key={deployment.name} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedDeployment(deployment.name)
                          setActiveTab('pods')
                        }}
                        className="flex items-center gap-3 hover:text-blue-400"
                      >
                        <Layers className="h-4 w-4 text-zinc-500" />
                        <span className="font-medium text-white">
                          {deployment.name}
                        </span>
                      </button>
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
                          isHealthy
                            ? 'bg-emerald-900/30 text-emerald-400'
                            : 'bg-amber-900/30 text-amber-400'
                        }`}
                      >
                        {isHealthy ? (
                          <>
                            <CheckCircle className="h-3 w-3" /> Available
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3" /> Updating
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {deployment.strategy}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            handleAction('restart', deployment.name)
                          }
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                          title="Restart"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <Link
                          href={`/k8s/scale?deployment=${deployment.name}`}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                          title="Scale"
                        >
                          <Scale className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() =>
                            handleAction('delete', deployment.name)
                          }
                          className="rounded p-1.5 text-red-400 hover:bg-zinc-700"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pods Table */}
      {activeTab === 'pods' && (
        <>
          {selectedDeployment && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Showing pods for:</span>
              <span className="rounded bg-blue-900/30 px-2 py-0.5 text-sm text-blue-400">
                {selectedDeployment}
              </span>
              <button
                onClick={() => setSelectedDeployment(null)}
                className="text-sm text-zinc-500 hover:text-white"
              >
                Clear filter
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/50">
            <table className="w-full">
              <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Pod
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
                    IP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Node
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                    Age
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {filteredPods.map((pod) => (
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
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm ${
                          pod.restarts > 0 ? 'text-amber-400' : 'text-zinc-400'
                        }`}
                      >
                        {pod.restarts}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm text-zinc-400">
                        {pod.ip || '-'}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {pod.node || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {pod.age}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/k8s/logs?pod=${pod.name}`}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                          title="Logs"
                        >
                          <Terminal className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleAction('delete', pod.name)}
                          className="rounded p-1.5 text-red-400 hover:bg-zinc-700"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default function K8sStatusPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <K8sStatusContent />
    </Suspense>
  )
}
