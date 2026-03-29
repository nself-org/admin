'use client'

import { FormSkeleton } from '@/components/skeletons'
import type { HelmRepo } from '@/types/k8s'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  Globe,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Mock repos
const mockRepos: HelmRepo[] = [
  {
    name: 'bitnami',
    url: 'https://charts.bitnami.com/bitnami',
    lastUpdated: '2024-01-25T10:00:00Z',
  },
  {
    name: 'prometheus-community',
    url: 'https://prometheus-community.github.io/helm-charts',
    lastUpdated: '2024-01-24T10:00:00Z',
  },
  {
    name: 'grafana',
    url: 'https://grafana.github.io/helm-charts',
    lastUpdated: '2024-01-24T10:00:00Z',
  },
  {
    name: 'jetstack',
    url: 'https://charts.jetstack.io',
    lastUpdated: '2024-01-23T10:00:00Z',
  },
  {
    name: 'ingress-nginx',
    url: 'https://kubernetes.github.io/ingress-nginx',
    lastUpdated: '2024-01-22T10:00:00Z',
  },
  {
    name: 'elastic',
    url: 'https://helm.elastic.co',
    lastUpdated: '2024-01-21T10:00:00Z',
  },
  {
    name: 'hashicorp',
    url: 'https://helm.releases.hashicorp.com',
    lastUpdated: '2024-01-20T10:00:00Z',
  },
]

// Popular repos to add
const popularRepos = [
  {
    name: 'bitnami',
    url: 'https://charts.bitnami.com/bitnami',
    description: 'Popular open source applications',
  },
  {
    name: 'prometheus-community',
    url: 'https://prometheus-community.github.io/helm-charts',
    description: 'Prometheus monitoring stack',
  },
  {
    name: 'grafana',
    url: 'https://grafana.github.io/helm-charts',
    description: 'Grafana and Loki',
  },
  {
    name: 'jetstack',
    url: 'https://charts.jetstack.io',
    description: 'cert-manager and more',
  },
  {
    name: 'ingress-nginx',
    url: 'https://kubernetes.github.io/ingress-nginx',
    description: 'NGINX Ingress Controller',
  },
  {
    name: 'elastic',
    url: 'https://helm.elastic.co',
    description: 'Elasticsearch, Kibana, Beats',
  },
  {
    name: 'hashicorp',
    url: 'https://helm.releases.hashicorp.com',
    description: 'Vault, Consul, etc.',
  },
  {
    name: 'datadog',
    url: 'https://helm.datadoghq.com',
    description: 'Datadog Agent',
  },
  {
    name: 'kubernetes-dashboard',
    url: 'https://kubernetes.github.io/dashboard/',
    description: 'K8s Dashboard',
  },
  {
    name: 'traefik',
    url: 'https://traefik.github.io/charts',
    description: 'Traefik Proxy',
  },
]

function HelmReposContent() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRepoName, setNewRepoName] = useState('')
  const [newRepoUrl, setNewRepoUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, mutate } = useSWR<{ repos: HelmRepo[] }>(
    '/api/helm/repos',
    fetcher,
    { fallbackData: { repos: mockRepos } },
  )

  const repos = data?.repos || mockRepos

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.url.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAdd = async () => {
    if (!newRepoName || !newRepoUrl) return
    setAdding(true)
    // Simulate adding
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await mutate()
    setAdding(false)
    setShowAddModal(false)
    setNewRepoName('')
    setNewRepoUrl('')
  }

  const handleAddPopular = async (repo: { name: string; url: string }) => {
    setNewRepoName(repo.name)
    setNewRepoUrl(repo.url)
    setShowAddModal(true)
  }

  const handleUpdate = async (repoName: string) => {
    setUpdating(repoName)
    // Simulate update
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await mutate()
    setUpdating(null)
  }

  const handleUpdateAll = async () => {
    setUpdating('all')
    // Simulate update all
    await new Promise((resolve) => setTimeout(resolve, 3000))
    await mutate()
    setUpdating(null)
  }

  const handleDelete = async (repoName: string) => {
    if (!confirm(`Are you sure you want to remove repository "${repoName}"?`)) {
      return
    }
    // Would call API
    await mutate()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Helm Repositories
          </h1>
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
            href="/helm"
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Helm Repositories
            </h1>
            <p className="text-sm text-zinc-400">
              {repos.length} repositories configured
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdateAll}
            disabled={updating !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {updating === 'all' ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Update All
              </>
            )}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-500"
          >
            <Plus className="h-4 w-4" />
            Add Repository
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Repositories Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/50">
        <table className="w-full">
          <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Repository
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                URL
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Last Updated
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700/50">
            {filteredRepos.map((repo) => (
              <tr key={repo.name} className="hover:bg-zinc-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-purple-400" />
                    <span className="font-medium text-white">{repo.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-purple-400"
                  >
                    {repo.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Clock className="h-3 w-3" />
                    {repo.lastUpdated
                      ? new Date(repo.lastUpdated).toLocaleDateString()
                      : 'Never'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/helm/install?repo=${repo.name}`}
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                      title="Browse charts"
                    >
                      <Package className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleUpdate(repo.name)}
                      disabled={updating !== null}
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-50"
                      title="Update repository"
                    >
                      {updating === repo.name ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(repo.name)}
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                      title="Remove repository"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRepos.length === 0 && (
          <div className="p-12 text-center">
            <Globe className="mx-auto mb-4 h-12 w-12 text-zinc-500" />
            <p className="text-zinc-400">No repositories found</p>
            <p className="text-sm text-zinc-500">
              Add a repository to get started
            </p>
          </div>
        )}
      </div>

      {/* Popular Repositories */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
        <h2 className="mb-4 font-semibold text-white">Popular Repositories</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {popularRepos
            .filter((pr) => !repos.some((r) => r.name === pr.name))
            .slice(0, 6)
            .map((repo) => (
              <button
                key={repo.name}
                onClick={() => handleAddPopular(repo)}
                className="flex items-start justify-between rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-3 text-left transition-all hover:border-purple-500/50"
              >
                <div>
                  <div className="font-medium text-white">{repo.name}</div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {repo.description}
                  </p>
                </div>
                <Plus className="h-4 w-4 text-purple-400" />
              </button>
            ))}
        </div>
        {popularRepos.filter((pr) => !repos.some((r) => r.name === pr.name))
          .length === 0 && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            All popular repositories have been added
          </div>
        )}
      </div>

      {/* CLI Info */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
        <h3 className="mb-2 text-sm font-medium text-zinc-400">CLI Commands</h3>
        <div className="space-y-2">
          <code className="block rounded bg-zinc-900 p-3 text-sm text-purple-400">
            helm repo add NAME URL
          </code>
          <code className="block rounded bg-zinc-900 p-3 text-sm text-purple-400">
            helm repo update
          </code>
          <code className="block rounded bg-zinc-900 p-3 text-sm text-purple-400">
            helm repo list
          </code>
        </div>
      </div>

      {/* Add Repository Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-800 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Add Repository
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="e.g., bitnami"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Repository URL
                </label>
                <input
                  type="url"
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  placeholder="https://charts.example.com"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewRepoName('')
                  setNewRepoUrl('')
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newRepoName || !newRepoUrl || adding}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-500 disabled:opacity-50"
              >
                {adding ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Repository
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HelmReposPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <HelmReposContent />
    </Suspense>
  )
}
