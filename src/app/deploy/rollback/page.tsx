'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import type { Deployment, RollbackInfo } from '@/types/deployment'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  History,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

function RollbackContent() {
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [rollbackInfo, setRollbackInfo] = useState<RollbackInfo | null>(null)
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null)
  const [confirmRollback, setConfirmRollback] = useState(false)

  const fetchDeployments = useCallback(async () => {
    try {
      const res = await fetch('/api/deploy')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDeployments(data.deployments ?? [])
    } catch (_error) {
      setDeployments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeployments()
  }, [fetchDeployments])

  const selectDeployment = (id: string) => {
    setSelectedDeployment(id)
    const deployment = deployments.find((d) => d.id === id)
    if (deployment) {
      setRollbackInfo({
        deploymentId: id,
        currentVersion: deployments[0].version,
        targetVersion: deployment.version,
        changes: deployment.changes || [],
        estimatedDowntime: '< 30 seconds',
        requiresConfirmation: true,
      })
    }
  }

  const executeRollback = async () => {
    if (!selectedDeployment) return
    setActionLoading(true)
    try {
      await fetch('/api/deploy/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deploymentId: selectedDeployment }),
      })
      await fetchDeployments()
      setConfirmRollback(false)
      setSelectedDeployment(null)
      setRollbackInfo(null)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />
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
          <h1 className="bg-gradient-to-r from-red-600 to-orange-400 bg-clip-text text-4xl font-bold text-transparent dark:from-red-400 dark:to-orange-300">
            Rollback Management
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Revert to a previous deployment version
          </p>
        </div>

        {/* Current Version */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Current Production Version</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {deployments[0]?.version}
              </p>
              <p className="text-sm text-zinc-500">
                Deployed {new Date(deployments[0]?.completedAt || '').toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Active</span>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {confirmRollback && rollbackInfo && (
          <div className="mb-8 rounded-xl border-2 border-red-500 bg-red-50 p-6 dark:bg-red-900/20">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-300">
                Confirm Rollback
              </h3>
            </div>
            <div className="mb-4 space-y-2">
              <p className="text-zinc-700 dark:text-zinc-300">
                You are about to rollback from <strong>{rollbackInfo.currentVersion}</strong> to{' '}
                <strong>{rollbackInfo.targetVersion}</strong>
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Estimated downtime: {rollbackInfo.estimatedDowntime}
              </p>
              <div className="rounded-lg bg-white p-4 dark:bg-zinc-800">
                <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Changes that will be reverted:
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {rollbackInfo.changes.map((change, idx) => (
                    <li key={idx}>{change}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={executeRollback}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Execute Rollback
              </button>
              <button
                onClick={() => setConfirmRollback(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Deployment History */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
            <History className="h-5 w-5" />
            Deployment History
          </h3>
          <div className="space-y-4">
            {deployments.map((deployment, idx) => (
              <div
                key={deployment.id}
                className={`rounded-lg border p-4 transition-all ${
                  selectedDeployment === deployment.id
                    ? 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-900/20'
                    : 'border-zinc-200 dark:border-zinc-700'
                } ${idx === 0 ? 'opacity-75' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-3">
                      <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {deployment.version}
                      </span>
                      {idx === 0 && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Current
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          deployment.status === 'success'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {deployment.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                      <span>Commit: {deployment.commit}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(deployment.startedAt).toLocaleString()}
                      </span>
                      <span>Duration: {deployment.duration}s</span>
                    </div>
                    {deployment.changes && deployment.changes.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Changes: {deployment.changes.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                  {deployment.rollbackAvailable && idx !== 0 && (
                    <button
                      onClick={() => {
                        selectDeployment(deployment.id)
                        setConfirmRollback(true)
                      }}
                      className="flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Rollback
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-red-500">nself rollback</span> - Rollback to previous version
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-red-500">nself rollback --to=v1.2.4</span> - Rollback to
              specific version
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-red-500">nself rollback --dry-run</span> - Preview rollback
              changes
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-red-500">nself deployments</span> - List deployment history
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function RollbackPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <RollbackContent />
    </Suspense>
  )
}
