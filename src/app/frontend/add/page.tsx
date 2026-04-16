'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  FolderGit2,
  GitBranch,
  Globe,
  Layers,
  Plus,
  RefreshCw,
  Settings,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'

interface FormData {
  name: string
  framework: string
  repository: string
  branch: string
  buildCommand: string
  outputDirectory: string
  installCommand: string
  rootDirectory: string
  environmentVariables: Array<{ key: string; value: string }>
}

const frameworks = [
  {
    id: 'nextjs',
    name: 'Next.js',
    icon: Zap,
    color: 'text-black dark:text-white',
  },
  { id: 'react', name: 'React', icon: Layers, color: 'text-blue-500' },
  { id: 'vue', name: 'Vue.js', icon: Layers, color: 'text-green-500' },
  { id: 'astro', name: 'Astro', icon: Globe, color: 'text-sky-500' },
  { id: 'svelte', name: 'Svelte', icon: Zap, color: 'text-orange-500' },
  { id: 'static', name: 'Static HTML', icon: Globe, color: 'text-zinc-500' },
]

const defaultSettings: Record<
  string,
  { buildCommand: string; outputDirectory: string; installCommand: string }
> = {
  nextjs: {
    buildCommand: 'npm run build',
    outputDirectory: '.next',
    installCommand: 'npm install',
  },
  react: {
    buildCommand: 'npm run build',
    outputDirectory: 'build',
    installCommand: 'npm install',
  },
  vue: {
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    installCommand: 'npm install',
  },
  astro: {
    buildCommand: 'npm run build',
    outputDirectory: 'dist',
    installCommand: 'npm install',
  },
  svelte: {
    buildCommand: 'npm run build',
    outputDirectory: 'build',
    installCommand: 'npm install',
  },
  static: { buildCommand: '', outputDirectory: '.', installCommand: '' },
}

function AddFrontendContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    framework: '',
    repository: '',
    branch: 'main',
    buildCommand: '',
    outputDirectory: '',
    installCommand: '',
    rootDirectory: './',
    environmentVariables: [{ key: '', value: '' }],
  })

  const handleFrameworkSelect = (frameworkId: string) => {
    const defaults = defaultSettings[frameworkId]
    setFormData({
      ...formData,
      framework: frameworkId,
      buildCommand: defaults.buildCommand,
      outputDirectory: defaults.outputDirectory,
      installCommand: defaults.installCommand,
    })
  }

  const addEnvVar = () => {
    setFormData({
      ...formData,
      environmentVariables: [
        ...formData.environmentVariables,
        { key: '', value: '' },
      ],
    })
  }

  const updateEnvVar = (
    index: number,
    field: 'key' | 'value',
    value: string,
  ) => {
    const updated = [...formData.environmentVariables]
    updated[index][field] = value
    setFormData({ ...formData, environmentVariables: updated })
  }

  const removeEnvVar = (index: number) => {
    const updated = formData.environmentVariables.filter((_, i) => i !== index)
    setFormData({ ...formData, environmentVariables: updated })
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await fetch('/api/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      router.push('/frontend')
    } finally {
      setLoading(false)
    }
  }

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.name && formData.framework
      case 2:
        return formData.repository
      case 3:
        return true
      default:
        return false
    }
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-3xl">
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <Link
            href="/frontend"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Frontend Apps
          </Link>
          <h1 className="bg-gradient-to-r from-cyan-600 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-cyan-400 dark:to-blue-300">
            Add Frontend App
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Connect a new frontend application to your project
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-medium ${
                  s < step
                    ? 'bg-cyan-600 text-white'
                    : s === step
                      ? 'border-2 border-cyan-600 text-cyan-600 dark:border-cyan-400 dark:text-cyan-400'
                      : 'border-2 border-zinc-300 text-zinc-400 dark:border-zinc-600'
                }`}
              >
                {s < step ? <Check className="h-5 w-5" /> : s}
              </div>
              <span
                className={`ml-3 text-sm font-medium ${
                  s <= step
                    ? 'text-zinc-900 dark:text-white'
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {s === 1 ? 'Framework' : s === 2 ? 'Repository' : 'Settings'}
              </span>
              {s < 3 && (
                <div
                  className={`mx-4 h-0.5 w-16 ${
                    s < step ? 'bg-cyan-600' : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Framework Selection */}
        {step === 1 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-white">
              Select Framework
            </h3>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                App Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="my-frontend-app"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
              />
              <p className="mt-1 text-sm text-zinc-500">
                This will be used as the app identifier
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {frameworks.map((fw) => {
                const Icon = fw.icon
                return (
                  <button
                    key={fw.id}
                    onClick={() => handleFrameworkSelect(fw.id)}
                    className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                      formData.framework === fw.id
                        ? 'border-cyan-500 bg-cyan-50 dark:border-cyan-500 dark:bg-cyan-900/20'
                        : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        formData.framework === fw.id
                          ? 'bg-cyan-100 dark:bg-cyan-900/50'
                          : 'bg-zinc-100 dark:bg-zinc-700'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${fw.color}`} />
                    </div>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {fw.name}
                    </span>
                    {formData.framework === fw.id && (
                      <Check className="ml-auto h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Repository */}
        {step === 2 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-white">
              Connect Repository
            </h3>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Git Repository URL
              </label>
              <div className="relative">
                <FolderGit2 className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={formData.repository}
                  onChange={(e) =>
                    setFormData({ ...formData, repository: e.target.value })
                  }
                  placeholder="https://github.com/user/repo"
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pr-4 pl-10 text-zinc-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Branch
                </label>
                <div className="relative">
                  <GitBranch className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) =>
                      setFormData({ ...formData, branch: e.target.value })
                    }
                    placeholder="main"
                    className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 pr-4 pl-10 text-zinc-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Root Directory
                </label>
                <input
                  type="text"
                  value={formData.rootDirectory}
                  onChange={(e) =>
                    setFormData({ ...formData, rootDirectory: e.target.value })
                  }
                  placeholder="./"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-zinc-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">Repository Access</p>
                <p>
                  Make sure the repository is accessible. For private repos,
                  configure your Git credentials in the settings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Build Settings */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
                <Settings className="h-5 w-5" />
                Build Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Install Command
                  </label>
                  <input
                    type="text"
                    value={formData.installCommand}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        installCommand: e.target.value,
                      })
                    }
                    placeholder="npm install"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 font-mono text-sm text-zinc-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Build Command
                  </label>
                  <input
                    type="text"
                    value={formData.buildCommand}
                    onChange={(e) =>
                      setFormData({ ...formData, buildCommand: e.target.value })
                    }
                    placeholder="npm run build"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 font-mono text-sm text-zinc-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Output Directory
                  </label>
                  <input
                    type="text"
                    value={formData.outputDirectory}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        outputDirectory: e.target.value,
                      })
                    }
                    placeholder=".next"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 font-mono text-sm text-zinc-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Environment Variables
                </h3>
                <button
                  onClick={addEnvVar}
                  className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
                >
                  <Plus className="h-4 w-4" />
                  Add Variable
                </button>
              </div>

              <div className="space-y-3">
                {formData.environmentVariables.map((env, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      type="text"
                      value={env.key}
                      onChange={(e) =>
                        updateEnvVar(index, 'key', e.target.value)
                      }
                      placeholder="KEY"
                      className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 font-mono text-sm text-zinc-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={env.value}
                      onChange={(e) =>
                        updateEnvVar(index, 'value', e.target.value)
                      }
                      placeholder="value"
                      className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 font-mono text-sm text-zinc-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                    />
                    {formData.environmentVariables.length > 1 && (
                      <button
                        onClick={() => removeEnvVar(index)}
                        className="rounded-lg px-3 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!isStepValid()}
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
            >
              Continue
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create App
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

export default function AddFrontendPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <AddFrontendContent />
    </Suspense>
  )
}
