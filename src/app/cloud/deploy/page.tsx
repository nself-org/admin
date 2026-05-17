'use client'

import { FormSkeleton } from '@/components/skeletons'
import type { CloudProvider, CloudServer } from '@/types/cloud'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Cloud,
  FileCode,
  Globe,
  Play,
  RefreshCw,
  Rocket,
  Server,
  Terminal,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type DeployStep = 'provider' | 'target' | 'config' | 'deploy'


function QuickDeployContent() {
  const router = useRouter()
  const [step, setStep] = useState<DeployStep>('provider')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedServer, setSelectedServer] = useState<string>('')
  const [deployTarget, setDeployTarget] = useState<'existing' | 'new'>(
    'existing',
  )
  const [deploying, setDeploying] = useState(false)
  const [deployStatus, setDeployStatus] = useState<{
    step: string
    progress: number
    logs: string[]
  } | null>(null)

  const { data: providerData } = useSWR<{ providers: CloudProvider[] }>(
    '/api/cloud/providers/configured',
    fetcher,
  )

  const { data: serverData } = useSWR<{ servers: CloudServer[] }>(
    '/api/cloud/servers',
    fetcher,
  )

  const providers = providerData?.providers ?? []
  const servers = (serverData?.servers ?? []).filter(
    (s) => s.status === 'running',
  )

  const handleDeploy = async () => {
    setDeploying(true)
    setDeployStatus({ step: 'Connecting to server...', progress: 0, logs: [] })

    // Simulate deployment steps
    const steps = [
      { step: 'Connecting to server...', progress: 10 },
      { step: 'Checking system requirements...', progress: 20 },
      { step: 'Installing Docker...', progress: 30 },
      { step: 'Installing Docker Compose...', progress: 40 },
      { step: 'Cloning repository...', progress: 50 },
      { step: 'Building Docker images...', progress: 60 },
      { step: 'Starting services...', progress: 80 },
      { step: 'Running health checks...', progress: 90 },
      { step: 'Deployment complete!', progress: 100 },
    ]

    for (const s of steps) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setDeployStatus((prev) => ({
        step: s.step,
        progress: s.progress,
        logs: [...(prev?.logs || []), s.step],
      }))
    }

    setDeploying(false)
  }

  const canProceed = () => {
    switch (step) {
      case 'provider':
        return selectedProvider !== ''
      case 'target':
        return deployTarget === 'new' || selectedServer !== ''
      case 'config':
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    switch (step) {
      case 'provider':
        setStep('target')
        break
      case 'target':
        if (deployTarget === 'new') {
          router.push(`/cloud/servers/create?provider=${selectedProvider}`)
        } else {
          setStep('config')
        }
        break
      case 'config':
        setStep('deploy')
        handleDeploy()
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="mt-12 mb-4">
        <h1 className="bg-gradient-to-r from-emerald-600 to-black bg-clip-text text-4xl/tight font-extrabold text-transparent sm:text-6xl/tight dark:from-emerald-400 dark:to-white">
          Quick Deploy
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Deploy your nself project to the cloud in minutes
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {[
          { id: 'provider', label: 'Provider' },
          { id: 'target', label: 'Target' },
          { id: 'config', label: 'Configure' },
          { id: 'deploy', label: 'Deploy' },
        ].map((s, i) => {
          const isActive = step === s.id
          const isPast =
            ['provider', 'target', 'config', 'deploy'].indexOf(step) >
            ['provider', 'target', 'config', 'deploy'].indexOf(s.id)

          return (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : isPast
                      ? 'bg-zinc-700 text-white'
                      : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    isPast
                      ? 'bg-emerald-500 text-white'
                      : isActive
                        ? 'bg-white text-emerald-600'
                        : 'bg-zinc-700 text-zinc-500'
                  }`}
                >
                  {isPast ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </span>
                {s.label}
              </div>
              {i < 3 && (
                <ArrowRight
                  className={`mx-2 h-4 w-4 ${
                    isPast ? 'text-emerald-500' : 'text-zinc-700'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="mx-auto max-w-3xl">
        {/* Step 1: Select Provider */}
        {step === 'provider' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Select Cloud Provider
            </h2>
            <p className="text-sm text-zinc-400">
              Choose a cloud provider for your deployment
            </p>

            {providers.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.name)}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      selectedProvider === provider.name
                        ? 'border-emerald-500 bg-emerald-900/20'
                        : 'border-zinc-700/50 bg-zinc-800/50 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-700">
                        <Cloud className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">
                          {provider.displayName}
                        </h3>
                        <p className="text-sm text-zinc-400 capitalize">
                          {provider.category}
                        </p>
                      </div>
                      {selectedProvider === provider.name && (
                        <CheckCircle className="ml-auto h-5 w-5 text-emerald-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-12 text-center">
                <Cloud className="mb-4 h-12 w-12 text-zinc-500" />
                <p className="text-lg text-zinc-400">No providers configured</p>
                <Link
                  href="/cloud/providers"
                  className="mt-4 text-emerald-400 hover:text-emerald-300"
                >
                  Configure a provider first
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Target */}
        {step === 'target' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Select Deployment Target
            </h2>
            <p className="text-sm text-zinc-400">
              Deploy to an existing server or create a new one
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDeployTarget('existing')}
                className={`rounded-lg border p-4 text-left transition-all ${
                  deployTarget === 'existing'
                    ? 'border-emerald-500 bg-emerald-900/20'
                    : 'border-zinc-700/50 bg-zinc-800/50 hover:border-emerald-500/50'
                }`}
              >
                <Server className="mb-2 h-6 w-6 text-emerald-400" />
                <h3 className="font-medium text-white">Existing Server</h3>
                <p className="text-sm text-zinc-400">
                  Deploy to a server you already have
                </p>
              </button>

              <button
                onClick={() => setDeployTarget('new')}
                className={`rounded-lg border p-4 text-left transition-all ${
                  deployTarget === 'new'
                    ? 'border-emerald-500 bg-emerald-900/20'
                    : 'border-zinc-700/50 bg-zinc-800/50 hover:border-emerald-500/50'
                }`}
              >
                <Rocket className="mb-2 h-6 w-6 text-emerald-400" />
                <h3 className="font-medium text-white">New Server</h3>
                <p className="text-sm text-zinc-400">
                  Provision a new server for deployment
                </p>
              </button>
            </div>

            {deployTarget === 'existing' && (
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-medium text-white">
                  Select Server
                </h3>
                {servers.length > 0 ? (
                  servers.map((server) => (
                    <button
                      key={server.id}
                      onClick={() => setSelectedServer(server.id)}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all ${
                        selectedServer === server.id
                          ? 'border-emerald-500 bg-emerald-900/20'
                          : 'border-zinc-700/50 bg-zinc-800/50 hover:border-emerald-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Server className="h-5 w-5 text-zinc-400" />
                        <div>
                          <span className="font-medium text-white">
                            {server.name}
                          </span>
                          <span className="ml-2 text-sm text-zinc-500">
                            {server.ip}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-zinc-500" />
                        <span className="text-sm text-zinc-400">
                          {server.region}
                        </span>
                        {selectedServer === server.id && (
                          <CheckCircle className="ml-2 h-5 w-5 text-emerald-400" />
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 text-center">
                    <p className="text-sm text-zinc-400">
                      No running servers available
                    </p>
                    <button
                      onClick={() => setDeployTarget('new')}
                      className="mt-2 text-sm text-emerald-400 hover:text-emerald-300"
                    >
                      Create a new server instead
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Configure */}
        {step === 'config' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              Configure Deployment
            </h2>
            <p className="text-sm text-zinc-400">
              Review and customize your deployment settings
            </p>

            <div className="space-y-4 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <div className="flex items-center justify-between border-b border-zinc-700 pb-4">
                <span className="text-zinc-400">Provider</span>
                <span className="font-medium text-white capitalize">
                  {selectedProvider}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-700 pb-4">
                <span className="text-zinc-400">Target Server</span>
                <span className="font-medium text-white">
                  {servers.find((s) => s.id === selectedServer)?.name || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-700 pb-4">
                <span className="text-zinc-400">Server IP</span>
                <span className="font-mono text-emerald-400">
                  {servers.find((s) => s.id === selectedServer)?.ip || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Deployment Method</span>
                <span className="flex items-center gap-2 text-white">
                  <FileCode className="h-4 w-4" />
                  Docker Compose
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-amber-800/50 bg-amber-900/20 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="font-medium text-amber-400">
                    Deployment will:
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                    <li>- Install Docker and Docker Compose if not present</li>
                    <li>- Clone your project repository</li>
                    <li>- Build and start all services</li>
                    <li>- Configure SSL certificates</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Deploy */}
        {step === 'deploy' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">
              {deploying ? 'Deploying...' : 'Deployment Complete'}
            </h2>

            {/* Progress Bar */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-zinc-400">
                  {deployStatus?.step || 'Preparing...'}
                </span>
                <span className="text-sm font-medium text-white">
                  {deployStatus?.progress || 0}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${deployStatus?.progress || 0}%` }}
                />
              </div>
            </div>

            {/* Deployment Logs */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-400">
                  Deployment Logs
                </span>
              </div>
              <div className="h-64 overflow-y-auto font-mono text-sm">
                {deployStatus?.logs.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 border-b border-zinc-800 py-1"
                  >
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                    <span className="text-zinc-300">{log}</span>
                  </div>
                ))}
                {deploying && (
                  <div className="flex items-center gap-2 py-1">
                    <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />
                    <span className="text-zinc-500">Running...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Success Message */}
            {!deploying && deployStatus?.progress === 100 && (
              <div className="rounded-lg border border-emerald-800/50 bg-emerald-900/20 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                  <div>
                    <h3 className="font-medium text-emerald-400">
                      Deployment Successful!
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Your application is now running at{' '}
                      <a
                        href={`http://${servers.find((s) => s.id === selectedServer)?.ip}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        http://
                        {servers.find((s) => s.id === selectedServer)?.ip}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        {step !== 'deploy' && (
          <div className="mt-6 flex items-center justify-between">
            {step !== 'provider' ? (
              <button
                onClick={() =>
                  setStep(
                    step === 'target'
                      ? 'provider'
                      : step === 'config'
                        ? 'target'
                        : 'provider',
                  )
                }
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2 text-white hover:bg-zinc-700"
              >
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {step === 'config' ? (
                <>
                  <Rocket className="h-4 w-4" />
                  Start Deployment
                </>
              ) : deployTarget === 'new' && step === 'target' ? (
                <>
                  Create Server
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Done Button */}
        {step === 'deploy' && !deploying && deployStatus?.progress === 100 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              href="/cloud/servers"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2 text-white hover:bg-zinc-700"
            >
              View Servers
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-500"
            >
              <Play className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function QuickDeployPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <QuickDeployContent />
    </Suspense>
  )
}
