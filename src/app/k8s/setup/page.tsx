'use client'

import { FormSkeleton } from '@/components/skeletons'
import type { K8sPlatform } from '@/types/k8s'
import {
  AlertCircle,
  ArrowLeft,
  Box,
  CheckCircle,
  FileCode,
  Play,
  Server,
  Terminal,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'

const platforms: {
  id: K8sPlatform
  name: string
  description: string
  logo: string
}[] = [
  {
    id: 'eks',
    name: 'Amazon EKS',
    description: 'AWS Elastic Kubernetes Service',
    logo: 'AWS',
  },
  {
    id: 'gke',
    name: 'Google GKE',
    description: 'Google Kubernetes Engine',
    logo: 'GCP',
  },
  {
    id: 'aks',
    name: 'Azure AKS',
    description: 'Azure Kubernetes Service',
    logo: 'Azure',
  },
  {
    id: 'doks',
    name: 'DigitalOcean K8s',
    description: 'DigitalOcean Kubernetes',
    logo: 'DO',
  },
  {
    id: 'lke',
    name: 'Linode LKE',
    description: 'Linode Kubernetes Engine',
    logo: 'Linode',
  },
  {
    id: 'vke',
    name: 'Vultr VKE',
    description: 'Vultr Kubernetes Engine',
    logo: 'Vultr',
  },
  {
    id: 'k3s',
    name: 'k3s',
    description: 'Lightweight Kubernetes',
    logo: 'k3s',
  },
  {
    id: 'minikube',
    name: 'Minikube',
    description: 'Local development cluster',
    logo: 'Mini',
  },
  {
    id: 'kind',
    name: 'kind',
    description: 'Kubernetes in Docker',
    logo: 'Kind',
  },
]

function K8sSetupContent() {
  const [step, setStep] = useState<
    'platform' | 'connect' | 'verify' | 'complete'
  >('platform')
  const [selectedPlatform, setSelectedPlatform] = useState<K8sPlatform | null>(
    null,
  )
  const [kubeconfig, setKubeconfig] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean
    message: string
    cluster?: { name: string; version: string; nodes: number }
  } | null>(null)

  const handleConnect = async () => {
    setConnecting(true)
    setConnectionResult(null)

    // Simulate connection
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setConnectionResult({
      success: true,
      message: 'Successfully connected to cluster',
      cluster: {
        name: 'production-cluster',
        version: '1.28.2',
        nodes: 3,
      },
    })
    setConnecting(false)
    setStep('verify')
  }

  const handleVerify = async () => {
    setConnecting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setConnecting(false)
    setStep('complete')
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
            Kubernetes Setup
          </h1>
          <p className="text-sm text-zinc-400">
            Connect to a Kubernetes cluster
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {[
          { id: 'platform', label: 'Platform' },
          { id: 'connect', label: 'Connect' },
          { id: 'verify', label: 'Verify' },
          { id: 'complete', label: 'Complete' },
        ].map((s, i) => {
          const stepOrder = ['platform', 'connect', 'verify', 'complete']
          const isActive = step === s.id
          const isPast = stepOrder.indexOf(step) > stepOrder.indexOf(s.id)

          return (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isPast
                      ? 'bg-zinc-700 text-white'
                      : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    isPast
                      ? 'bg-blue-500 text-white'
                      : isActive
                        ? 'bg-white text-blue-600'
                        : 'bg-zinc-700 text-zinc-500'
                  }`}
                >
                  {isPast ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </span>
                {s.label}
              </div>
              {i < 3 && (
                <div
                  className={`mx-2 h-0.5 w-12 ${
                    isPast ? 'bg-blue-500' : 'bg-zinc-700'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="mx-auto max-w-3xl">
        {/* Step 1: Select Platform */}
        {step === 'platform' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Select Kubernetes Platform
            </h2>
            <p className="text-sm text-zinc-400">
              Choose your Kubernetes provider or local development environment
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    selectedPlatform === platform.id
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-zinc-700/50 bg-zinc-800/50 hover:border-blue-500/50'
                  }`}
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700 text-sm font-bold text-white">
                    {platform.logo}
                  </div>
                  <h3 className="font-medium text-white">{platform.name}</h3>
                  <p className="text-sm text-zinc-400">
                    {platform.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep('connect')}
                disabled={!selectedPlatform}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Connect */}
        {step === 'connect' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Connect to Cluster
            </h2>
            <p className="text-sm text-zinc-400">
              Provide your kubeconfig or connection details
            </p>

            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <div className="mb-4 flex items-center gap-2">
                <FileCode className="h-5 w-5 text-blue-400" />
                <span className="font-medium text-white">Kubeconfig</span>
              </div>

              <textarea
                value={kubeconfig}
                onChange={(e) => setKubeconfig(e.target.value)}
                placeholder="Paste your kubeconfig content here, or leave empty to use ~/.kube/config"
                className="h-48 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-4 font-mono text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              />

              <p className="mt-2 text-sm text-zinc-500">
                You can also run:{' '}
                <code className="text-blue-400">
                  nself k8s connect --kubeconfig=path/to/config
                </code>
              </p>
            </div>

            {connectionResult && (
              <div
                className={`flex items-center gap-2 rounded-lg p-4 ${
                  connectionResult.success
                    ? 'bg-emerald-900/30 text-emerald-400'
                    : 'bg-red-900/30 text-red-400'
                }`}
              >
                {connectionResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                {connectionResult.message}
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep('platform')}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2 text-white hover:bg-zinc-700"
              >
                Back
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Terminal className="h-4 w-4" />
                    Connect
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verify */}
        {step === 'verify' && connectionResult?.cluster && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Verify Connection
            </h2>
            <p className="text-sm text-zinc-400">
              Review your cluster details and verify the connection
            </p>

            <div className="rounded-lg border border-emerald-800/50 bg-emerald-900/20 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-emerald-400" />
                <div>
                  <h3 className="font-medium text-emerald-400">
                    Connection Successful
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Successfully connected to your Kubernetes cluster
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <h3 className="mb-4 font-medium text-white">Cluster Details</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Cluster Name</span>
                  <span className="font-medium text-white">
                    {connectionResult.cluster.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Kubernetes Version</span>
                  <span className="font-medium text-white">
                    v{connectionResult.cluster.version}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Nodes</span>
                  <span className="font-medium text-white">
                    {connectionResult.cluster.nodes}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Platform</span>
                  <span className="font-medium text-white uppercase">
                    {selectedPlatform}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep('connect')}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2 text-white hover:bg-zinc-700"
              >
                Back
              </button>
              <button
                onClick={handleVerify}
                disabled={connecting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Complete Setup
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-900/30">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-white">
                Setup Complete!
              </h2>
              <p className="mt-2 text-zinc-400">
                Your Kubernetes cluster is now connected and ready to use
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Link
                href="/k8s/convert"
                className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 text-center transition-colors hover:border-blue-500/50"
              >
                <FileCode className="mx-auto mb-2 h-8 w-8 text-blue-400" />
                <h3 className="font-medium text-white">Convert</h3>
                <p className="text-sm text-zinc-400">Generate K8s manifests</p>
              </Link>

              <Link
                href="/k8s/deploy"
                className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 text-center transition-colors hover:border-blue-500/50"
              >
                <Server className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                <h3 className="font-medium text-white">Deploy</h3>
                <p className="text-sm text-zinc-400">Deploy to cluster</p>
              </Link>

              <Link
                href="/k8s/status"
                className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 text-center transition-colors hover:border-blue-500/50"
              >
                <Box className="mx-auto mb-2 h-8 w-8 text-sky-400" />
                <h3 className="font-medium text-white">Status</h3>
                <p className="text-sm text-zinc-400">View deployments</p>
              </Link>
            </div>

            <div className="pt-4">
              <Link
                href="/k8s"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-500"
              >
                <Play className="h-4 w-4" />
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function K8sSetupPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <K8sSetupContent />
    </Suspense>
  )
}
