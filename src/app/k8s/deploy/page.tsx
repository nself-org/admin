'use client'

import { FormSkeleton } from '@/components/skeletons'
import type { K8sCluster, K8sNamespace } from '@/types/k8s'
import {
  AlertCircle,
  ArrowLeft,
  Box,
  CheckCircle,
  FileCode,
  Rocket,
  Terminal,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type DeploymentStep = {
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
}

function K8sDeployContent() {
  const [selectedNamespace, setSelectedNamespace] = useState('default')
  const [dryRun, setDryRun] = useState(true)
  const [deploying, setDeploying] = useState(false)
  const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStep[]>([])

  const { data: clusterData, error: clusterError } = useSWR<{
    cluster: K8sCluster
  }>('/api/k8s/cluster', fetcher)

  const { data: namespaceData, error: namespaceError } = useSWR<{
    namespaces: K8sNamespace[]
  }>('/api/k8s/namespaces', fetcher)

  const cluster = clusterData?.cluster ?? null
  const namespaces = namespaceData?.namespaces ?? []

  const handleDeploy = async () => {
    setDeploying(true)
    setDeploymentSteps([{ name: 'Deploying to cluster', status: 'running' }])

    try {
      const res = await fetch('/api/k8s/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namespace: selectedNamespace, dryRun }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setDeploymentSteps([
        {
          name: 'Deploying to cluster',
          status: 'success',
          message: dryRun ? 'Dry run - no changes made' : 'Completed',
        },
      ])
    } catch (err) {
      setDeploymentSteps([
        {
          name: 'Deploying to cluster',
          status: 'error',
          message:
            err instanceof Error ? err.message : 'Deployment failed',
        },
      ])
    } finally {
      setDeploying(false)
    }
  }

  const isDeploymentComplete =
    deploymentSteps.length > 0 &&
    deploymentSteps.every((s) => s.status === 'success' || s.status === 'error')

  if (clusterError || namespaceError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/k8s"
            className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold text-white">
            Deploy to Kubernetes
          </h1>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-6">
          <p className="text-red-400">
            {(clusterError ?? namespaceError) instanceof Error
              ? (clusterError ?? namespaceError).message
              : 'Failed to load cluster data'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/k8s"
          className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 hover:bg-zinc-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Deploy to Kubernetes
          </h1>
          <p className="text-sm text-zinc-400">
            Deploy your manifests to the cluster
          </p>
        </div>
      </div>

      {/* Cluster Status */}
      {cluster ? (
      <>
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
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Deployment Options */}
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h2 className="mb-4 font-semibold text-white">
              Deployment Options
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Target Namespace
                </label>
                <select
                  value={selectedNamespace}
                  onChange={(e) => setSelectedNamespace(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  {namespaces
                    .filter((ns) => !ns.name.startsWith('kube-'))
                    .map((ns) => (
                      <option key={ns.name} value={ns.name}>
                        {ns.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-white">Dry Run</label>
                  <p className="text-xs text-zinc-500">
                    Preview changes without applying
                  </p>
                </div>
                <button
                  onClick={() => setDryRun(!dryRun)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    dryRun ? 'bg-blue-600' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      dryRun ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleDeploy}
              disabled={deploying || cluster.status !== 'connected'}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {deploying ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  {dryRun ? 'Dry Run' : 'Deploy'}
                </>
              )}
            </button>
          </div>

          {/* CLI Command */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-400">
              Or use CLI
            </h3>
            <code className="block rounded bg-zinc-900 p-3 text-sm text-blue-400">
              nself k8s deploy{dryRun ? ' --dry-run' : ''} --namespace=
              {selectedNamespace}
            </code>
          </div>
        </div>

        {/* Deployment Progress */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50">
            <div className="border-b border-zinc-700/50 p-4">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-blue-400" />
                <h2 className="font-semibold text-white">
                  Deployment Progress
                </h2>
              </div>
            </div>

            {deploymentSteps.length > 0 ? (
              <div className="p-4">
                <div className="space-y-3">
                  {deploymentSteps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        {step.status === 'pending' && (
                          <div className="h-5 w-5 rounded-full border-2 border-zinc-600" />
                        )}
                        {step.status === 'running' && (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                        )}
                        {step.status === 'success' && (
                          <CheckCircle className="h-5 w-5 text-emerald-400" />
                        )}
                        {step.status === 'error' && (
                          <AlertCircle className="h-5 w-5 text-red-400" />
                        )}
                        <span
                          className={`text-sm ${
                            step.status === 'pending'
                              ? 'text-zinc-500'
                              : 'text-white'
                          }`}
                        >
                          {step.name}
                        </span>
                      </div>
                      {step.message && (
                        <span className="text-sm text-zinc-500">
                          {step.message}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Completion Message */}
                {isDeploymentComplete && (
                  <div
                    className={`mt-4 rounded-lg p-4 ${
                      dryRun
                        ? 'border border-blue-800/50 bg-blue-900/20'
                        : 'border border-emerald-800/50 bg-emerald-900/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle
                        className={`h-6 w-6 ${
                          dryRun ? 'text-blue-400' : 'text-emerald-400'
                        }`}
                      />
                      <div>
                        <h3
                          className={`font-medium ${
                            dryRun ? 'text-blue-400' : 'text-emerald-400'
                          }`}
                        >
                          {dryRun
                            ? 'Dry Run Complete'
                            : 'Deployment Successful!'}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-400">
                          {dryRun
                            ? 'All validations passed. Run again without dry-run to apply changes.'
                            : `All resources have been deployed to the ${selectedNamespace} namespace.`}
                        </p>
                        {!dryRun && (
                          <div className="mt-3 flex items-center gap-3">
                            <Link
                              href="/k8s/status"
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
                            >
                              <Box className="h-4 w-4" />
                              View Status
                            </Link>
                            <Link
                              href="/k8s/logs"
                              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
                            >
                              <Terminal className="h-4 w-4" />
                              View Logs
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <FileCode className="mb-4 h-12 w-12 text-zinc-500" />
                <p className="text-zinc-400">Ready to deploy</p>
                <p className="text-sm text-zinc-500">
                  Click Deploy to start the deployment process
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </>
    ) : (
      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-6 text-center">
        <p className="text-zinc-400">No cluster connected</p>
        <p className="text-sm text-zinc-500">
          Connect a Kubernetes cluster to enable deployments
        </p>
      </div>
    )}
    </div>
  )
}

export default function K8sDeployPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <K8sDeployContent />
    </Suspense>
  )
}
