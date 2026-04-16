'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { TableSkeleton } from '@/components/skeletons'
import type { Environment, EnvironmentDiff } from '@/types/deployment'
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  ChevronDown,
  Diff,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

function EnvironmentDiffContent() {
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState(false)
  const [sourceEnv, setSourceEnv] = useState<Environment>('staging')
  const [targetEnv, setTargetEnv] = useState<Environment>('production')
  const [diff, setDiff] = useState<EnvironmentDiff | null>(null)

  const environments: Environment[] = [
    'local',
    'development',
    'staging',
    'production',
  ]

  const fetchDiff = useCallback(async () => {
    setComparing(true)
    try {
      // Mock data - replace with real API
      await new Promise((resolve) => setTimeout(resolve, 500))
      setDiff({
        source: sourceEnv,
        target: targetEnv,
        variables: {
          added: ['NEW_FEATURE_FLAG', 'ANALYTICS_KEY'],
          removed: ['OLD_DEBUG_MODE'],
          changed: [
            {
              key: 'LOG_LEVEL',
              sourceValue: 'debug',
              targetValue: 'info',
            },
            {
              key: 'CACHE_TTL',
              sourceValue: '300',
              targetValue: '3600',
            },
          ],
        },
        secrets: {
          added: ['STRIPE_WEBHOOK_SECRET'],
          removed: [],
          changed: ['API_KEY'],
        },
        services: {
          added: [],
          removed: [],
          changed: [
            {
              name: 'hasura',
              sourceVersion: '2.33.0',
              targetVersion: '2.32.1',
            },
            {
              name: 'auth',
              sourceVersion: '1.3.0-beta',
              targetVersion: '1.2.5',
            },
          ],
        },
      })
    } catch (_error) {
      // Handle error silently
    } finally {
      setComparing(false)
      setLoading(false)
    }
  }, [sourceEnv, targetEnv])

  useEffect(() => {
    fetchDiff()
  }, [fetchDiff])

  const swapEnvironments = () => {
    const temp = sourceEnv
    setSourceEnv(targetEnv)
    setTargetEnv(temp)
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
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
            href="/environments"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Environments
          </Link>
          <h1 className="bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-sky-400 dark:to-pink-300">
            Environment Comparison
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Compare configurations between environments
          </p>
        </div>

        {/* Environment Selector */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="min-w-[180px]">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Source Environment
              </label>
              <div className="relative">
                <select
                  value={sourceEnv}
                  onChange={(e) => setSourceEnv(e.target.value as Environment)}
                  className="w-full appearance-none rounded-lg border border-zinc-300 bg-white px-4 py-2.5 pr-10 text-zinc-900 capitalize focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                >
                  {environments
                    .filter((e) => e !== targetEnv)
                    .map((env) => (
                      <option key={env} value={env}>
                        {env}
                      </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>

            <button
              onClick={swapEnvironments}
              className="mt-6 rounded-lg border border-zinc-300 p-2 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-700"
              title="Swap environments"
            >
              <ArrowLeftRight className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </button>

            <div className="min-w-[180px]">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Target Environment
              </label>
              <div className="relative">
                <select
                  value={targetEnv}
                  onChange={(e) => setTargetEnv(e.target.value as Environment)}
                  className="w-full appearance-none rounded-lg border border-zinc-300 bg-white px-4 py-2.5 pr-10 text-zinc-900 capitalize focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                >
                  {environments
                    .filter((e) => e !== sourceEnv)
                    .map((env) => (
                      <option key={env} value={env}>
                        {env}
                      </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>

            <button
              onClick={fetchDiff}
              disabled={comparing}
              className="mt-6 flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
            >
              {comparing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Diff className="h-4 w-4" />
              )}
              Compare
            </button>
          </div>
        </div>

        {diff && (
          <>
            {/* Summary */}
            <div className="mb-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Variables
                  </span>
                  <div className="flex gap-2 text-xs">
                    <span className="rounded bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      +{diff.variables.added.length}
                    </span>
                    <span className="rounded bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      -{diff.variables.removed.length}
                    </span>
                    <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      ~{diff.variables.changed.length}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Secrets
                  </span>
                  <div className="flex gap-2 text-xs">
                    <span className="rounded bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      +{diff.secrets.added.length}
                    </span>
                    <span className="rounded bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      -{diff.secrets.removed.length}
                    </span>
                    <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      ~{diff.secrets.changed.length}
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Services
                  </span>
                  <div className="flex gap-2 text-xs">
                    <span className="rounded bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      +{diff.services.added.length}
                    </span>
                    <span className="rounded bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      -{diff.services.removed.length}
                    </span>
                    <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      ~{diff.services.changed.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Variables Diff */}
            <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Environment Variables
              </h3>
              <div className="space-y-2">
                {diff.variables.added.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-lg bg-green-50 px-4 py-2 dark:bg-green-900/20"
                  >
                    <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="font-mono text-sm text-green-700 dark:text-green-300">
                      {key}
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Added in {sourceEnv}
                    </span>
                  </div>
                ))}
                {diff.variables.removed.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-lg bg-red-50 px-4 py-2 dark:bg-red-900/20"
                  >
                    <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="font-mono text-sm text-red-700 dark:text-red-300">
                      {key}
                    </span>
                    <span className="text-xs text-red-600 dark:text-red-400">
                      Missing in {sourceEnv}
                    </span>
                  </div>
                ))}
                {diff.variables.changed.map((change) => (
                  <div
                    key={change.key}
                    className="rounded-lg bg-yellow-50 px-4 py-2 dark:bg-yellow-900/20"
                  >
                    <div className="flex items-center gap-3">
                      <Diff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="font-mono text-sm font-medium text-yellow-700 dark:text-yellow-300">
                        {change.key}
                      </span>
                    </div>
                    <div className="mt-1 ml-7 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-zinc-500">
                          {sourceEnv}:
                        </span>
                        <span className="ml-2 font-mono text-zinc-700 dark:text-zinc-300">
                          {change.sourceValue}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-zinc-500">
                          {targetEnv}:
                        </span>
                        <span className="ml-2 font-mono text-zinc-700 dark:text-zinc-300">
                          {change.targetValue}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {diff.variables.added.length === 0 &&
                  diff.variables.removed.length === 0 &&
                  diff.variables.changed.length === 0 && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Check className="h-5 w-5" />
                      <span>No differences in environment variables</span>
                    </div>
                  )}
              </div>
            </div>

            {/* Secrets Diff */}
            <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Secrets
              </h3>
              <div className="space-y-2">
                {diff.secrets.added.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-lg bg-green-50 px-4 py-2 dark:bg-green-900/20"
                  >
                    <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="font-mono text-sm text-green-700 dark:text-green-300">
                      {key}
                    </span>
                  </div>
                ))}
                {diff.secrets.removed.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-lg bg-red-50 px-4 py-2 dark:bg-red-900/20"
                  >
                    <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="font-mono text-sm text-red-700 dark:text-red-300">
                      {key}
                    </span>
                  </div>
                ))}
                {diff.secrets.changed.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-lg bg-yellow-50 px-4 py-2 dark:bg-yellow-900/20"
                  >
                    <Diff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="font-mono text-sm text-yellow-700 dark:text-yellow-300">
                      {key}
                    </span>
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">
                      Value differs
                    </span>
                  </div>
                ))}
                {diff.secrets.added.length === 0 &&
                  diff.secrets.removed.length === 0 &&
                  diff.secrets.changed.length === 0 && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Check className="h-5 w-5" />
                      <span>No differences in secrets</span>
                    </div>
                  )}
              </div>
            </div>

            {/* Services Diff */}
            <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Services
              </h3>
              <div className="space-y-2">
                {diff.services.changed.map((service) => (
                  <div
                    key={service.name}
                    className="rounded-lg bg-yellow-50 px-4 py-3 dark:bg-yellow-900/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {service.name}
                      </span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-zinc-500">
                          {sourceEnv}:{' '}
                          <span className="font-mono text-zinc-700 dark:text-zinc-300">
                            {service.sourceVersion}
                          </span>
                        </span>
                        <span className="text-zinc-400">→</span>
                        <span className="text-zinc-500">
                          {targetEnv}:{' '}
                          <span className="font-mono text-zinc-700 dark:text-zinc-300">
                            {service.targetVersion}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {diff.services.changed.length === 0 && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check className="h-5 w-5" />
                    <span>No differences in service versions</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* CLI Reference */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself env diff staging prod
              </span>{' '}
              - Compare staging to production
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">nself env diff --full</span> -
              Show all differences including unchanged
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself env sync staging prod
              </span>{' '}
              - Sync staging config to production
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function EnvironmentDiffPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <EnvironmentDiffContent />
    </Suspense>
  )
}
