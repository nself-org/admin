'use client'

import { TableSkeleton } from '@/components/skeletons'
import type { K8sCluster } from '@/types/k8s'
import {
  ArrowLeft,
  Box,
  CheckCircle,
  Globe,
  Plus,
  RefreshCw,
  Server,
  Settings,
  Star,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Mock clusters
const mockClusters: K8sCluster[] = [
  {
    name: 'production',
    context: 'do-nyc1-production',
    platform: 'doks',
    apiServer: 'https://k8s-prod.example.com:6443',
    namespace: 'default',
    status: 'connected',
    version: '1.28.2',
    nodes: 3,
    current: true,
  },
  {
    name: 'staging',
    context: 'do-nyc1-staging',
    platform: 'doks',
    apiServer: 'https://k8s-staging.example.com:6443',
    namespace: 'default',
    status: 'connected',
    version: '1.28.2',
    nodes: 2,
    current: false,
  },
  {
    name: 'development',
    context: 'minikube',
    platform: 'minikube',
    apiServer: 'https://localhost:8443',
    namespace: 'default',
    status: 'disconnected',
    version: '1.27.0',
    nodes: 1,
    current: false,
  },
]

function K8sClustersContent() {
  const [switching, setSwitching] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR<{ clusters: K8sCluster[] }>(
    '/api/k8s/clusters',
    fetcher,
    { fallbackData: { clusters: mockClusters } },
  )

  const clusters = data?.clusters || mockClusters
  const currentCluster = clusters.find((c) => c.current)

  const handleSwitch = async (clusterName: string) => {
    setSwitching(clusterName)
    // Simulate switching
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await mutate()
    setSwitching(null)
  }

  const handleDelete = async (clusterName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${clusterName} from your contexts?`,
      )
    ) {
      return
    }
    // Would call API
    await mutate()
  }

  const platformLabels: Record<string, string> = {
    eks: 'Amazon EKS',
    gke: 'Google GKE',
    aks: 'Azure AKS',
    doks: 'DigitalOcean',
    lke: 'Linode LKE',
    vke: 'Vultr VKE',
    k3s: 'k3s',
    minikube: 'Minikube',
    kind: 'kind',
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Clusters</h1>
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-zinc-800/50" />
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
              Kubernetes Clusters
            </h1>
            <p className="text-sm text-zinc-400">
              {clusters.length} clusters configured
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Link
            href="/k8s/setup"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Add Cluster
          </Link>
        </div>
      </div>

      {/* Current Cluster Banner */}
      {currentCluster && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-800/50 bg-emerald-900/20 p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20">
              <Star className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-white">
                  Current: {currentCluster.name}
                </h2>
                <span className="rounded-full bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-400">
                  Active
                </span>
              </div>
              <p className="text-sm text-zinc-400">
                {platformLabels[currentCluster.platform] ||
                  currentCluster.platform}{' '}
                | v{currentCluster.version} | {currentCluster.nodes} nodes
              </p>
            </div>
          </div>
          <Link
            href="/k8s"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
          >
            <Box className="h-4 w-4" />
            View Dashboard
          </Link>
        </div>
      )}

      {/* Clusters List */}
      <div className="space-y-4">
        {clusters.map((cluster) => (
          <div
            key={cluster.name}
            className={`rounded-lg border p-4 transition-all ${
              cluster.current
                ? 'border-emerald-500/50 bg-emerald-900/10'
                : cluster.status === 'connected'
                  ? 'border-zinc-700/50 bg-zinc-800/50'
                  : 'border-zinc-700/50 bg-zinc-800/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                    cluster.status === 'connected'
                      ? 'bg-blue-500/20'
                      : 'bg-zinc-700'
                  }`}
                >
                  <Box
                    className={`h-6 w-6 ${
                      cluster.status === 'connected'
                        ? 'text-blue-400'
                        : 'text-zinc-500'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{cluster.name}</h3>
                    {cluster.current && (
                      <span className="rounded-full bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-400">
                        Current
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                        cluster.status === 'connected'
                          ? 'bg-emerald-900/30 text-emerald-400'
                          : 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {cluster.status === 'connected' && (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      {cluster.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400">{cluster.context}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Cluster Info */}
                <div className="hidden space-y-1 text-right md:block">
                  <div className="flex items-center justify-end gap-2 text-sm text-zinc-400">
                    <Globe className="h-4 w-4" />
                    {platformLabels[cluster.platform] || cluster.platform}
                  </div>
                  <div className="flex items-center justify-end gap-2 text-sm text-zinc-400">
                    <Server className="h-4 w-4" />v{cluster.version} |{' '}
                    {cluster.nodes} nodes
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!cluster.current && cluster.status === 'connected' && (
                    <button
                      onClick={() => handleSwitch(cluster.name)}
                      disabled={switching !== null}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
                    >
                      {switching === cluster.name ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Switching...
                        </>
                      ) : (
                        'Switch'
                      )}
                    </button>
                  )}
                  {!cluster.current && cluster.status !== 'connected' && (
                    <Link
                      href="/k8s/setup"
                      className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
                    >
                      <Settings className="h-4 w-4" />
                      Reconnect
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(cluster.name)}
                    disabled={cluster.current}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-zinc-400 hover:bg-zinc-700 hover:text-red-400 disabled:opacity-50"
                    title={
                      cluster.current
                        ? "Can't delete current cluster"
                        : 'Remove cluster'
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {clusters.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12 text-center">
          <Box className="mb-4 h-12 w-12 text-zinc-500" />
          <p className="text-lg text-zinc-400">No clusters configured</p>
          <p className="text-sm text-zinc-500">
            Add a Kubernetes cluster to get started
          </p>
          <Link
            href="/k8s/setup"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Add Cluster
          </Link>
        </div>
      )}

      {/* CLI Info */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
        <h3 className="mb-2 text-sm font-medium text-zinc-400">CLI Commands</h3>
        <div className="space-y-2">
          <code className="block rounded bg-zinc-900 p-3 text-sm text-blue-400">
            kubectl config get-contexts
          </code>
          <code className="block rounded bg-zinc-900 p-3 text-sm text-blue-400">
            kubectl config use-context CONTEXT_NAME
          </code>
        </div>
      </div>
    </div>
  )
}

export default function K8sClustersPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <K8sClustersContent />
    </Suspense>
  )
}
