'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import { AlertCircle, Play, RefreshCw, Save } from 'lucide-react'
import { Suspense, useState } from 'react'

interface EnvVariable {
  key: string
  value: string
  isSecret: boolean
}

const defaultServices = [
  { id: 'postgres', name: 'PostgreSQL', enabled: true },
  { id: 'hasura', name: 'Hasura GraphQL', enabled: true },
  { id: 'auth', name: 'Auth Service', enabled: true },
  { id: 'functions', name: 'Functions', enabled: true },
  { id: 'minio', name: 'MinIO Storage', enabled: true },
  { id: 'redis', name: 'Redis Cache', enabled: false },
  { id: 'mailpit', name: 'Mailpit', enabled: true },
  { id: 'nginx', name: 'Nginx Proxy', enabled: true },
]

function DevelopmentEnvironmentContent() {
  const [domain, setDomain] = useState('localhost')
  const [port, setPort] = useState('3000')
  const [cpuLimit, setCpuLimit] = useState('2')
  const [memoryLimit, setMemoryLimit] = useState('4096')
  const [services, setServices] = useState(defaultServices)
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([
    { key: 'NODE_ENV', value: 'development', isSecret: false },
    { key: 'LOG_LEVEL', value: 'debug', isSecret: false },
  ])
  const [isSaving, setIsSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const handleServiceToggle = (serviceId: string) => {
    setServices(services.map((s) => (s.id === serviceId ? { ...s, enabled: !s.enabled } : s)))
  }

  const handleAddEnvVar = () => {
    setEnvVariables([...envVariables, { key: '', value: '', isSecret: false }])
  }

  const handleRemoveEnvVar = (index: number) => {
    setEnvVariables(envVariables.filter((_, i) => i !== index))
  }

  const handleEnvVarChange = (index: number, field: keyof EnvVariable, value: string | boolean) => {
    const updated = [...envVariables]
    updated[index] = { ...updated[index], [field]: value }
    setEnvVariables(updated)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveResult(null)

    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSaving(false)
    setSaveResult({
      success: true,
      message: 'Development environment configuration saved successfully',
    })
  }

  const handleDeploy = async () => {
    // Deploy logic would go here
    await handleSave()
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 flex items-center justify-between border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <div>
            <h1 className="bg-gradient-to-r from-green-600 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-green-400 dark:to-blue-300">
              Development Environment
            </h1>
            <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
              Configure your local development environment settings
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Save className="h-5 w-5" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleDeploy}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Play className="h-5 w-5" />
              Deploy
            </button>
          </div>
        </div>

        {/* Save Result */}
        {saveResult && (
          <div
            className={`mb-6 rounded-xl border p-4 ${
              saveResult.success
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {saveResult.success ? (
                <RefreshCw className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              <p
                className={
                  saveResult.success
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }
              >
                {saveResult.message}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Environment Settings */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Environment Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Domain
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Port
                </label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Resource Limits */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Resource Limits
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  CPU Limit (cores)
                </label>
                <input
                  type="number"
                  value={cpuLimit}
                  onChange={(e) => setCpuLimit(e.target.value)}
                  min="1"
                  max="16"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Memory Limit (MB)
                </label>
                <input
                  type="number"
                  value={memoryLimit}
                  onChange={(e) => setMemoryLimit(e.target.value)}
                  min="512"
                  max="32768"
                  step="512"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Service Selection */}
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Services</h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Select which services to run in your development environment
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <div
                key={service.id}
                className={`rounded-lg border-2 p-4 transition-all ${
                  service.enabled
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={service.enabled}
                    onChange={() => handleServiceToggle(service.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-zinc-900 dark:text-white">{service.name}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Environment Variables */}
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Environment Variables
            </h2>
            <button
              onClick={handleAddEnvVar}
              className="rounded-lg border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Add Variable
            </button>
          </div>
          <div className="space-y-3">
            {envVariables.map((envVar, index) => (
              <div key={index} className="flex gap-3">
                <input
                  type="text"
                  value={envVar.key}
                  onChange={(e) => handleEnvVarChange(index, 'key', e.target.value)}
                  placeholder="KEY"
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 font-mono text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
                <input
                  type={envVar.isSecret ? 'password' : 'text'}
                  value={envVar.value}
                  onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                  placeholder="value"
                  className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 font-mono text-sm text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={envVar.isSecret}
                    onChange={(e) => handleEnvVarChange(index, 'isSecret', e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Secret</span>
                </label>
                <button
                  onClick={() => handleRemoveEnvVar(index)}
                  className="rounded-lg border border-red-300 px-3 py-2 text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default function DevelopmentEnvironmentPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <DevelopmentEnvironmentContent />
    </Suspense>
  )
}
