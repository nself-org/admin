'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Code,
  Database,
  FileText,
  Key,
  RefreshCw,
} from 'lucide-react'
import { Suspense, useState } from 'react'

interface SyncOption {
  id: string
  name: string
  description: string
  icon: typeof Code
  enabled: boolean
  changes?: number
}

const syncOptions: SyncOption[] = [
  {
    id: 'code',
    name: 'Code & Configuration',
    description: 'Application code, docker-compose, nginx configs',
    icon: Code,
    enabled: true,
    changes: 12,
  },
  {
    id: 'database',
    name: 'Database Schema',
    description: 'Migrations, schema, and table structures',
    icon: Database,
    enabled: false,
    changes: 5,
  },
  {
    id: 'files',
    name: 'Files & Storage',
    description: 'Uploaded files, assets, and media',
    icon: FileText,
    enabled: false,
    changes: 234,
  },
  {
    id: 'env',
    name: 'Environment Variables',
    description: 'Non-secret environment configuration',
    icon: Key,
    enabled: true,
    changes: 3,
  },
]

function DeploymentSyncContent() {
  const [sourceEnv, setSourceEnv] = useState('staging')
  const [targetEnv, setTargetEnv] = useState('production')
  const [options, setOptions] = useState(syncOptions)
  const [showPreview, setShowPreview] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncComplete, setSyncComplete] = useState(false)

  const handleToggleOption = (id: string) => {
    setOptions(
      options.map((opt) =>
        opt.id === id ? { ...opt, enabled: !opt.enabled } : opt,
      ),
    )
  }

  const handlePreview = () => {
    setShowPreview(true)
  }

  const handleSync = async () => {
    setIsSyncing(true)

    // Simulate sync
    await new Promise((resolve) => setTimeout(resolve, 3000))

    setIsSyncing(false)
    setSyncComplete(true)
  }

  const totalChanges = options
    .filter((opt) => opt.enabled)
    .reduce((sum, opt) => sum + (opt.changes || 0), 0)

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <h1 className="bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-sky-400 dark:to-pink-300">
            Sync Environments
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Synchronize code, database, files, and configuration between
            environments
          </p>
        </div>

        {!syncComplete ? (
          <>
            {/* Environment Selection */}
            <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-white">
                Select Environments
              </h2>

              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Source Environment
                  </label>
                  <select
                    value={sourceEnv}
                    onChange={(e) => setSourceEnv(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="local">Local (Development)</option>
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>

                <div className="mt-7 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>

                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Target Environment
                  </label>
                  <select
                    value={targetEnv}
                    onChange={(e) => setTargetEnv(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="local">Local (Development)</option>
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>

              {sourceEnv === 'production' || targetEnv === 'production' ? (
                <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-300">
                        Production Environment Selected
                      </p>
                      <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                        Syncing to/from production requires extra caution.
                        Changes will affect live users.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Sync Options */}
            <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-white">
                What to Sync
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                {options.map((option) => {
                  const Icon = option.icon
                  return (
                    <div
                      key={option.id}
                      className={`rounded-lg border-2 p-4 transition-all ${
                        option.enabled
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={option.enabled}
                          onChange={() => handleToggleOption(option.id)}
                          className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-zinc-900 dark:text-white">
                              {option.name}
                            </span>
                            {option.changes && option.enabled ? (
                              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                {option.changes} changes
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {option.description}
                          </p>
                        </div>
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Preview Panel */}
            {showPreview && (
              <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-white">
                  Preview Changes
                </h2>

                <div className="space-y-4">
                  {options
                    .filter((opt) => opt.enabled)
                    .map((option) => (
                      <div
                        key={option.id}
                        className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <option.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-zinc-900 dark:text-white">
                            {option.name}
                          </span>
                          <span className="text-sm text-zinc-500">
                            {option.changes} changes
                          </span>
                        </div>

                        <div className="space-y-2 rounded-lg bg-zinc-50 p-3 font-mono text-sm dark:bg-zinc-900">
                          {Array.from({
                            length: Math.min(option.changes || 0, 3),
                          }).map((_, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-green-600 dark:text-green-400"
                            >
                              <span>+</span>
                              <span>
                                {option.id === 'code'
                                  ? `src/app/${i === 0 ? 'api' : i === 1 ? 'components' : 'pages'}/file${i}.tsx`
                                  : option.id === 'database'
                                    ? `migration_${Date.now() + i}.sql`
                                    : option.id === 'files'
                                      ? `uploads/image_${i}.jpg`
                                      : `${['PORT', 'DEBUG', 'LOG_LEVEL'][i]}=value${i}`}
                              </span>
                            </div>
                          ))}
                          {(option.changes || 0) > 3 && (
                            <div className="text-zinc-500">
                              ... and {(option.changes || 0) - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!showPreview ? (
                <button
                  onClick={handlePreview}
                  disabled={totalChanges === 0}
                  className="flex items-center gap-2 rounded-lg border border-zinc-300 px-6 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Preview Changes ({totalChanges})
                </button>
              ) : null}

              <button
                onClick={handleSync}
                disabled={isSyncing || totalChanges === 0}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5" />
                    Execute Sync
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
              Sync Complete!
            </h2>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              Successfully synchronized {totalChanges} changes from {sourceEnv}{' '}
              to {targetEnv}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setSyncComplete(false)
                  setShowPreview(false)
                }}
                className="rounded-lg border border-zinc-300 px-6 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Sync Again
              </button>
              <a
                href="/deployment/environments"
                className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              >
                View Environments
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function DeploymentSyncPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <DeploymentSyncContent />
    </Suspense>
  )
}
