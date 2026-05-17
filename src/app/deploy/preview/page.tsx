'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import type { PreviewEnvironment } from '@/types/deployment'
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  GitBranch,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

function PreviewDeployContent() {
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [previews, setPreviews] = useState<PreviewEnvironment[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newBranch, setNewBranch] = useState('')

  const fetchPreviews = useCallback(async () => {
    try {
      const res = await fetch('/api/deploy/preview')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPreviews(data.previews ?? [])
    } catch (_error) {
      setPreviews([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPreviews()
  }, [fetchPreviews])

  const createPreview = async () => {
    if (!newBranch.trim()) return
    setCreating(true)
    try {
      await fetch('/api/deploy/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: newBranch }),
      })
      await fetchPreviews()
      setNewBranch('')
      setShowCreateForm(false)
    } finally {
      setCreating(false)
    }
  }

  const deletePreview = async (id: string) => {
    try {
      await fetch(`/api/deploy/preview/${id}`, { method: 'DELETE' })
      setPreviews(previews.filter((p) => p.id !== id))
    } catch (_error) {
      // Handle error
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'running':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'creating':
      case 'building':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'error':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
    }
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
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
          <Link
            href="/deployment/environments"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Environments
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-teal-600 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent dark:from-teal-400 dark:to-cyan-300">
                Preview Environments
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Create temporary environments for branch testing
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Create Preview
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-8 rounded-xl border border-teal-200 bg-teal-50 p-6 dark:border-teal-800 dark:bg-teal-900/20">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Create Preview Environment
            </h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Branch Name
                </label>
                <div className="relative">
                  <GitBranch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    placeholder="feature/my-feature"
                    className="w-full rounded-lg border border-zinc-300 bg-white py-2 pr-4 pl-10 text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <button
                  onClick={createPreview}
                  disabled={!newBranch.trim() || creating}
                  className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                >
                  {creating && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Create
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview List */}
        {previews.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <GitBranch className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              No Preview Environments
            </h3>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              Create a preview environment to test feature branches.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Create Preview
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {previews.map((preview) => (
              <div
                key={preview.id}
                className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {preview.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(preview.status)}`}
                      >
                        {preview.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-4 w-4" />
                        {preview.branch}
                      </span>
                      <span>Commit: {preview.commit}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {preview.url && preview.status === 'active' && (
                      <a
                        href={preview.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </a>
                    )}
                    <button
                      onClick={() => deletePreview(preview.id)}
                      className="rounded-lg border border-red-300 p-2 text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Services */}
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  {preview.services.map((service) => (
                    <div
                      key={service.name}
                      className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {service.name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(service.status)}`}
                        >
                          {service.status}
                        </span>
                      </div>
                      {service.url && (
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-teal-600 hover:underline dark:text-teal-400"
                        >
                          {service.url}
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Created {new Date(preview.createdAt).toLocaleDateString()}
                  </span>
                  {preview.expiresAt && (
                    <span>
                      Expires {new Date(preview.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                  <span>By {preview.createdBy}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-teal-500">nself preview</span> - List
              preview environments
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-teal-500">
                nself preview create feature/my-feature
              </span>{' '}
              - Create preview
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-teal-500">
                nself preview delete preview-id
              </span>{' '}
              - Delete preview
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function PreviewDeployPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <PreviewDeployContent />
    </Suspense>
  )
}
