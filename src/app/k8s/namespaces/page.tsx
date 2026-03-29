'use client'

import { TableSkeleton } from '@/components/skeletons'
import type { K8sNamespace } from '@/types/k8s'
import {
  AlertCircle,
  ArrowLeft,
  Box,
  CheckCircle,
  FolderTree,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Mock namespaces
const mockNamespaces: K8sNamespace[] = [
  {
    name: 'default',
    status: 'Active',
    createdAt: '2024-01-01T00:00:00Z',
    labels: { 'kubernetes.io/metadata.name': 'default' },
  },
  {
    name: 'production',
    status: 'Active',
    createdAt: '2024-01-05T10:00:00Z',
    labels: { environment: 'production', team: 'platform' },
  },
  {
    name: 'staging',
    status: 'Active',
    createdAt: '2024-01-05T10:00:00Z',
    labels: { environment: 'staging', team: 'platform' },
  },
  {
    name: 'development',
    status: 'Active',
    createdAt: '2024-01-10T10:00:00Z',
    labels: { environment: 'development' },
  },
  {
    name: 'monitoring',
    status: 'Active',
    createdAt: '2024-01-03T10:00:00Z',
    labels: { app: 'monitoring' },
  },
  { name: 'kube-system', status: 'Active', createdAt: '2024-01-01T00:00:00Z' },
  { name: 'kube-public', status: 'Active', createdAt: '2024-01-01T00:00:00Z' },
  {
    name: 'kube-node-lease',
    status: 'Active',
    createdAt: '2024-01-01T00:00:00Z',
  },
]

// Mock resource counts per namespace
const resourceCounts: Record<
  string,
  { deployments: number; pods: number; services: number }
> = {
  default: { deployments: 4, pods: 9, services: 4 },
  production: { deployments: 6, pods: 18, services: 8 },
  staging: { deployments: 4, pods: 8, services: 6 },
  development: { deployments: 2, pods: 4, services: 3 },
  monitoring: { deployments: 3, pods: 5, services: 3 },
  'kube-system': { deployments: 8, pods: 12, services: 4 },
  'kube-public': { deployments: 0, pods: 0, services: 0 },
  'kube-node-lease': { deployments: 0, pods: 0, services: 0 },
}

function K8sNamespacesContent() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newNamespace, setNewNamespace] = useState('')
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSystem, setShowSystem] = useState(false)

  const { data, isLoading, mutate } = useSWR<{ namespaces: K8sNamespace[] }>(
    '/api/k8s/namespaces',
    fetcher,
    { fallbackData: { namespaces: mockNamespaces } },
  )

  const namespaces = data?.namespaces || mockNamespaces

  const filteredNamespaces = namespaces.filter((ns) => {
    const matchesSearch = ns.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesSystem = showSystem || !ns.name.startsWith('kube-')
    return matchesSearch && matchesSystem
  })

  const handleCreate = async () => {
    if (!newNamespace) return
    setCreating(true)
    // Simulate creation
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await mutate()
    setCreating(false)
    setShowCreateModal(false)
    setNewNamespace('')
  }

  const handleDelete = async (namespaceName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete namespace "${namespaceName}"? This will delete all resources in it.`,
      )
    ) {
      return
    }
    // Would call API
    await mutate()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Namespaces</h1>
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
            <h1 className="text-2xl font-semibold text-white">Namespaces</h1>
            <p className="text-sm text-zinc-400">
              {namespaces.length} namespaces
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
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Create Namespace
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search namespaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={showSystem}
            onChange={(e) => setShowSystem(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
          />
          Show system namespaces
        </label>
      </div>

      {/* Namespaces Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/50">
        <table className="w-full">
          <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Namespace
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Resources
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Labels
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Created
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700/50">
            {filteredNamespaces.map((namespace) => {
              const counts = resourceCounts[namespace.name] || {
                deployments: 0,
                pods: 0,
                services: 0,
              }
              const isSystem = namespace.name.startsWith('kube-')

              return (
                <tr key={namespace.name} className="hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FolderTree
                        className={`h-4 w-4 ${
                          isSystem ? 'text-zinc-500' : 'text-blue-400'
                        }`}
                      />
                      <span className="font-medium text-white">
                        {namespace.name}
                      </span>
                      {isSystem && (
                        <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                          System
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                        namespace.status === 'Active'
                          ? 'bg-emerald-900/30 text-emerald-400'
                          : 'bg-amber-900/30 text-amber-400'
                      }`}
                    >
                      {namespace.status === 'Active' ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {namespace.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {counts.deployments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Box className="h-3 w-3" />
                        {counts.pods}
                      </span>
                      <span className="flex items-center gap-1">
                        <Settings className="h-3 w-3" />
                        {counts.services}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {namespace.labels &&
                    Object.keys(namespace.labels).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(namespace.labels)
                          .filter(([key]) => !key.includes('kubernetes.io'))
                          .slice(0, 2)
                          .map(([key, value]) => (
                            <span
                              key={key}
                              className="rounded bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-400"
                            >
                              {key}={value}
                            </span>
                          ))}
                        {Object.keys(namespace.labels).filter(
                          (k) => !k.includes('kubernetes.io'),
                        ).length > 2 && (
                          <span className="text-xs text-zinc-500">
                            +
                            {Object.keys(namespace.labels).filter(
                              (k) => !k.includes('kubernetes.io'),
                            ).length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {new Date(namespace.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/k8s/status?namespace=${namespace.name}`}
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                        title="View resources"
                      >
                        <Box className="h-4 w-4" />
                      </Link>
                      {!isSystem && namespace.name !== 'default' && (
                        <button
                          onClick={() => handleDelete(namespace.name)}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                          title="Delete namespace"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Create Namespace
            </h2>
            <div className="mb-4">
              <label className="mb-1 block text-sm text-zinc-400">
                Namespace Name
              </label>
              <input
                type="text"
                value={newNamespace}
                onChange={(e) => setNewNamespace(e.target.value)}
                placeholder="e.g., my-namespace"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Must be lowercase, alphanumeric with dashes
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newNamespace || creating}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLI Info */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
        <h3 className="mb-2 text-sm font-medium text-zinc-400">CLI Commands</h3>
        <div className="space-y-2">
          <code className="block rounded bg-zinc-900 p-3 text-sm text-blue-400">
            kubectl get namespaces
          </code>
          <code className="block rounded bg-zinc-900 p-3 text-sm text-blue-400">
            kubectl create namespace NAMESPACE_NAME
          </code>
        </div>
      </div>
    </div>
  )
}

export default function K8sNamespacesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <K8sNamespacesContent />
    </Suspense>
  )
}
