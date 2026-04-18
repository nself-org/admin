'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const TOTAL_STEPS = 5

type StepIndex = 0 | 1 | 2 | 3 | 4

function ProgressDots({ current }: { current: StepIndex }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <span
          key={i}
          className={[
            'h-2 rounded-full transition-all duration-200',
            i === current
              ? 'w-6 bg-indigo-500'
              : i < current
                ? 'w-2 bg-indigo-700'
                : 'w-2 bg-gray-700',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Welcome to nSelf Admin
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          This wizard walks you through connecting Admin to your nSelf backend.
        </p>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-left">
        <p className="mb-3 text-xs font-medium tracking-wide text-gray-500 uppercase">
          System requirements
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2 text-gray-300">
            <span className="text-green-400">&#10003;</span>
            Node.js 18 or later
          </li>
          <li className="flex items-center gap-2 text-gray-300">
            <span className="text-green-400">&#10003;</span>
            Docker 20 or later
          </li>
          <li className="flex items-center gap-2 text-gray-300">
            <span className="text-green-400">&#10003;</span>
            nSelf CLI installed and on PATH
          </li>
        </ul>
      </div>

      <button
        onClick={onNext}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Get started
      </button>
    </div>
  )
}

function StepConnect({
  backendUrl,
  apiKey,
  onUrlChange,
  onKeyChange,
  onBack,
  onConnect,
  connecting,
  error,
}: {
  backendUrl: string
  apiKey: string
  onUrlChange: (v: string) => void
  onKeyChange: (v: string) => void
  onBack: () => void
  onConnect: () => void
  connecting: boolean
  error: string
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">
          Connect to your backend
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Enter the URL and API key for your nSelf backend.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="backend-url"
            className="mb-1.5 block text-sm font-medium text-gray-300"
          >
            Backend URL
          </label>
          <input
            id="backend-url"
            type="url"
            value={backendUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="http://localhost:8080"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="api-key"
            className="mb-1.5 block text-sm font-medium text-gray-300"
          >
            API key
          </label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => onKeyChange(e.target.value)}
            placeholder="nself_pro_..."
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
        >
          Back
        </button>
        <button
          onClick={onConnect}
          disabled={connecting || !backendUrl}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {connecting ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </div>
  )
}

function StepVerify({
  version,
  onBack,
  onNext,
}: {
  version: string
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">
          Connection verified
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Admin is connected to your nSelf backend.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-lg border border-green-800 bg-green-950/30 px-6 py-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-2xl text-green-400">
          &#10003;
        </span>
        <p className="text-sm text-gray-300">
          Backend version:{' '}
          <span className="font-mono text-white">{version || 'unknown'}</span>
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          Next
        </button>
      </div>
    </div>
  )
}

function StepDemo({
  onCreateDemo,
  onSkip,
  onBack,
  creating,
  error,
}: {
  onCreateDemo: () => void
  onSkip: () => void
  onBack: () => void
  creating: boolean
  error: string
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Demo project</h2>
        <p className="mt-1 text-sm text-gray-400">
          Create a demo project to explore nSelf Admin with pre-configured
          services and sample data.
        </p>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-sm text-gray-400">
        Runs <span className="font-mono text-gray-300">nself init --demo</span>{' '}
        to scaffold a ready-to-use local project. Takes about 30 seconds.
      </div>

      {error && (
        <p className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
        >
          Back
        </button>
        <button
          onClick={onSkip}
          disabled={creating}
          className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          Skip
        </button>
        <button
          onClick={onCreateDemo}
          disabled={creating}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create demo'}
        </button>
      </div>
    </div>
  )
}

function StepDone({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-xl font-semibold text-white">Setup complete</h2>
        <p className="mt-1 text-sm text-gray-400">
          nSelf Admin is ready to use.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-lg border border-indigo-800 bg-indigo-950/30 px-6 py-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 text-2xl text-indigo-400">
          &#10003;
        </span>
        <p className="text-sm text-gray-300">
          Connected and configured successfully.
        </p>
      </div>

      <button
        onClick={onOpen}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Open Dashboard
      </button>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<StepIndex>(0)
  const [backendUrl, setBackendUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [connectedVersion, setConnectedVersion] = useState('')
  const [creatingDemo, setCreatingDemo] = useState(false)
  const [demoError, setDemoError] = useState('')

  async function handleConnect() {
    setConnecting(true)
    setConnectError('')
    try {
      const res = await fetch('/api/onboarding/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: backendUrl, apiKey }),
      })
      const data = (await res.json()) as {
        success: boolean
        version?: string
        error?: string
      }
      if (data.success) {
        setConnectedVersion(data.version ?? '')
        await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 2 }),
        })
        setCurrentStep(2)
      } else {
        setConnectError(data.error ?? 'Connection failed.')
      }
    } catch {
      setConnectError(
        'Could not reach the server. Check the URL and try again.',
      )
    } finally {
      setConnecting(false)
    }
  }

  async function handleCreateDemo() {
    setCreatingDemo(true)
    setDemoError('')
    try {
      const res = await fetch('/api/onboarding/demo', { method: 'POST' })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (data.success) {
        setCurrentStep(4)
      } else {
        setDemoError(data.error ?? 'Demo creation failed.')
      }
    } catch {
      setDemoError(
        'Request failed. You can skip this step and create a project later.',
      )
    } finally {
      setCreatingDemo(false)
    }
  }

  async function handleOpenDashboard() {
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 4 }),
    })
    router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
      <ProgressDots current={currentStep} />

      {currentStep === 0 && <StepWelcome onNext={() => setCurrentStep(1)} />}

      {currentStep === 1 && (
        <StepConnect
          backendUrl={backendUrl}
          apiKey={apiKey}
          onUrlChange={setBackendUrl}
          onKeyChange={setApiKey}
          onBack={() => setCurrentStep(0)}
          onConnect={handleConnect}
          connecting={connecting}
          error={connectError}
        />
      )}

      {currentStep === 2 && (
        <StepVerify
          version={connectedVersion}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
        />
      )}

      {currentStep === 3 && (
        <StepDemo
          onCreateDemo={handleCreateDemo}
          onSkip={() => setCurrentStep(4)}
          onBack={() => setCurrentStep(2)}
          creating={creatingDemo}
          error={demoError}
        />
      )}

      {currentStep === 4 && <StepDone onOpen={handleOpenDashboard} />}
    </div>
  )
}
