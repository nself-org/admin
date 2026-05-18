'use client'

import type { K8sDeployment } from '@/types/k8s'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Layers,
  Minus,
  Plus,
  RefreshCw,
  Scale,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function K8sScalePageContent() {
  const searchParams = useSearchParams()
  const initialDeployment = searchParams.get('deployment') || ''

  const [selectedDeployment] = useState(initialDeployment)
  const [targetReplicas, setTargetReplicas] = useState<Record<string, number>>({})
  const [scaling, setScaling] = useState<string | null>(null)
  const [scaleResult, setScaleResult] = useState<{
    deployment: string
    success: boolean
    message: string
  } | null>(null)

  const { data, error, isLoading, mutate } = useSWR<{
    deployments: K8sDeployment[]
  }>('/api/k8s/deployments', fetcher, { refreshInterval: 5000 })

  const deployments = data?.deployments ?? []

  const handleScale = async (deploymentName: string) => {
    const target = targetReplicas[deploymentName]
    if (target === undefined) return

    setScaling(deploymentName)
    setScaleResult(null)

    try {
      const res = await fetch(`/api/k8s/deployments/${encodeURIComponent(deploymentName)}/scale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replicas: target }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setScaleResult({
        deployment: deploymentName,
        success: true,
        message: `Successfully scaled ${deploymentName} to ${target} replicas`,
      })
      await mutate()
    } catch (err) {
      setScaleResult({
        deployment: deploymentName,
        success: false,
        message: err instanceof Error ? err.message : `Failed to scale ${deploymentName}`,
      })
    } finally {
      setScaling(null)
    }
  }

  const getReplicaCount = (deployment: K8sDeployment) =>
    targetReplicas[deployment.name] ?? deployment.replicas.desired

  const hasChanges = (deployment: K8sDeployment) =>
    targetReplicas[deployment.name] !== undefined &&
    targetReplicas[deployment.name] !== deployment.replicas.desired

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Scale Deployments</h1>
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-zinc-800/50" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Scale Deployments</h1>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-6">
          <p className="text-red-400">
            {error instanceof Error ? error.message : 'Failed to load deployments'}
          </p>
          <button
            onClick={() => mutate()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (deployments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Scale Deployments</h1>
        </div>
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-zinc-500" />
          <p className="text-zinc-400">No deployments found</p>
          <p className="text-sm text-zinc-500">
            Connect to a Kubernetes cluster to manage deployments
          </p>
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
            <h1 className="text-2xl font-semibold text-white">Scale Deployments</h1>
            <p className="text-sm text-zinc-400">Adjust replica counts for your deployments</p>
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

      {/* Scale Result */}
      {scaleResult && (
        <div
          className={`flex items-center gap-2 rounded-lg p-4 ${
            scaleResult.success
              ? 'bg-emerald-900/30 text-emerald-400'
              : 'bg-red-900/30 text-red-400'
          }`}
        >
          {scaleResult.success ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {scaleResult.message}
        </div>
      )}

      {/* Deployments Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {deployments.map((deployment) => {
          const currentReplicas = getReplicaCount(deployment)
          const changed = hasChanges(deployment)
          const isHealthy = deployment.replicas.ready === deployment.replicas.desired

          return (
            <div
              key={deployment.name}
              className={`rounded-lg border p-4 transition-all ${
                selectedDeployment === deployment.name
                  ? 'border-blue-500 bg-blue-900/20'
                  : changed
                    ? 'border-amber-500/50 bg-amber-900/10'
                    : 'border-zinc-700/50 bg-zinc-800/50'
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700">
                    <Layers className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{deployment.name}</h3>
                    <p className="text-sm text-zinc-400">{deployment.image}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                    isHealthy
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : 'bg-amber-900/30 text-amber-400'
                  }`}
                >
                  {isHealthy ? (
                    <>
                      <CheckCircle className="h-3 w-3" /> Healthy
                    </>
                  ) : (
                    <>
                      <Activity className="h-3 w-3" /> Scaling
                    </>
                  )}
                </span>
              </div>

              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Current Replicas</span>
                  <span className="font-medium text-white">
                    {deployment.replicas.ready}/{deployment.replicas.desired}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-700">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${(deployment.replicas.ready / deployment.replicas.desired) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-sm text-zinc-400">Target Replicas</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setTargetReplicas((prev) => ({
                        ...prev,
                        [deployment.name]: Math.max(0, currentReplicas - 1),
                      }))
                    }
                    disabled={currentReplicas <= 0}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700 disabled:opacity-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={currentReplicas}
                    onChange={(e) =>
                      setTargetReplicas((prev) => ({
                        ...prev,
                        [deployment.name]: Math.max(0, Math.min(20, parseInt(e.target.value) || 0)),
                      }))
                    }
                    className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-lg font-bold text-white focus:border-blue-500 focus:outline-none"
                  />

                  <button
                    onClick={() =>
                      setTargetReplicas((prev) => ({
                        ...prev,
                        [deployment.name]: Math.min(20, currentReplicas + 1),
                      }))
                    }
                    disabled={currentReplicas >= 20}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  {changed && (
                    <span className="text-sm text-amber-400">
                      (was {deployment.replicas.desired})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleScale(deployment.name)}
                  disabled={!changed || scaling === deployment.name}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {scaling === deployment.name ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Scaling...
                    </>
                  ) : (
                    <>
                      <Scale className="h-4 w-4" />
                      Scale
                    </>
                  )}
                </button>
                {changed && (
                  <button
                    onClick={() =>
                      setTargetReplicas((prev) => {
                        const { [deployment.name]: _, ...rest } = prev
                        return rest
                      })
                    }
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:text-white"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Scale Presets */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
        <h3 className="mb-4 font-medium text-white">Quick Presets</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Development (1 replica each)', replicas: 1 },
            { label: 'Staging (2 replicas each)', replicas: 2 },
            { label: 'Production (3 replicas each)', replicas: 3 },
            { label: 'High Availability (5 replicas each)', replicas: 5 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                const updates: Record<string, number> = {}
                deployments.forEach((d) => {
                  updates[d.name] = preset.replicas
                })
                setTargetReplicas(updates)
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* CLI Command */}
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
        <h3 className="mb-2 text-sm font-medium text-zinc-400">Or use CLI</h3>
        <code className="block rounded bg-zinc-900 p-3 text-sm text-blue-400">
          kubectl scale deployment/DEPLOYMENT_NAME --replicas=N
        </code>
      </div>
    </div>
  )
}

export default function K8sScalePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-10 w-48 animate-pulse rounded bg-zinc-800" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg bg-zinc-800/50" />
            ))}
          </div>
        </div>
      }
    >
      <K8sScalePageContent />
    </Suspense>
  )
}
