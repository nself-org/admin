'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import type { BlueGreenDeployment } from '@/types/deployment'
import {
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle,
  Circle,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

function BlueGreenDeployContent() {
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deployment, setDeployment] = useState<BlueGreenDeployment | null>(null)

  const fetchDeployment = useCallback(async () => {
    try {
      // Mock data - replace with real API
      setDeployment({
        id: 'bg-1',
        environment: 'production',
        activeColor: 'blue',
        blueVersion: 'v1.2.5',
        greenVersion: 'v1.3.0',
        blueStatus: 'active',
        greenStatus: 'standby',
        lastSwitch: new Date(Date.now() - 86400000 * 2).toISOString(),
        canRollback: true,
      })
    } catch (_error) {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeployment()
  }, [fetchDeployment])

  const switchEnvironment = async () => {
    setActionLoading('switch')
    try {
      await fetch('/api/deploy/blue-green', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch' }),
      })
      await fetchDeployment()
    } finally {
      setActionLoading(null)
    }
  }

  const deployToStandby = async () => {
    setActionLoading('deploy')
    try {
      await fetch('/api/deploy/blue-green', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deploy' }),
      })
      await fetchDeployment()
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
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
          <h1 className="bg-gradient-to-r from-blue-600 to-green-400 bg-clip-text text-4xl font-bold text-transparent dark:from-blue-400 dark:to-green-300">
            Blue-Green Deployment
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Zero-downtime deployments with instant rollback capability
          </p>
        </div>

        {deployment && (
          <>
            {/* Environment Cards */}
            <div className="mb-8 grid gap-6 md:grid-cols-2">
              {/* Blue Environment */}
              <div
                className={`rounded-xl border-2 p-6 transition-all ${
                  deployment.activeColor === 'blue'
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                    : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                      <Circle className="h-6 w-6 fill-blue-500 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                        Blue
                      </h3>
                      <p className="text-sm text-zinc-500">
                        {deployment.blueVersion}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${
                      deployment.blueStatus === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : deployment.blueStatus === 'deploying'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {deployment.blueStatus}
                  </span>
                </div>
                <div className="space-y-2">
                  {deployment.activeColor === 'blue' && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Receiving Traffic</span>
                    </div>
                  )}
                  {deployment.blueStatus === 'standby' && (
                    <p className="text-sm text-zinc-500">
                      Ready for traffic switch
                    </p>
                  )}
                </div>
              </div>

              {/* Green Environment */}
              <div
                className={`rounded-xl border-2 p-6 transition-all ${
                  deployment.activeColor === 'green'
                    ? 'border-green-500 bg-green-50 dark:border-green-500 dark:bg-green-900/20'
                    : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                      <Circle className="h-6 w-6 fill-green-500 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                        Green
                      </h3>
                      <p className="text-sm text-zinc-500">
                        {deployment.greenVersion}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${
                      deployment.greenStatus === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : deployment.greenStatus === 'deploying'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {deployment.greenStatus}
                  </span>
                </div>
                <div className="space-y-2">
                  {deployment.activeColor === 'green' && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Receiving Traffic</span>
                    </div>
                  )}
                  {deployment.greenStatus === 'standby' && (
                    <p className="text-sm text-zinc-500">
                      Ready for traffic switch
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Actions
              </h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={switchEnvironment}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === 'switch' ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowLeftRight className="h-5 w-5" />
                  )}
                  Switch Traffic to{' '}
                  {deployment.activeColor === 'blue' ? 'Green' : 'Blue'}
                </button>
                <button
                  onClick={deployToStandby}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-2 rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {actionLoading === 'deploy' ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  Deploy to{' '}
                  {deployment.activeColor === 'blue' ? 'Green' : 'Blue'}{' '}
                  (Standby)
                </button>
              </div>
              {deployment.canRollback && (
                <p className="mt-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Rollback available - switch traffic back at any time
                </p>
              )}
              {deployment.lastSwitch && (
                <p className="mt-2 text-sm text-zinc-500">
                  Last switch:{' '}
                  {new Date(deployment.lastSwitch).toLocaleString()}
                </p>
              )}
            </div>

            {/* How it Works */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                How Blue-Green Works
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50">
                    1
                  </div>
                  <h4 className="mb-1 font-medium text-zinc-900 dark:text-white">
                    Deploy to Standby
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Deploy new version to the inactive environment without
                    affecting live traffic.
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/50">
                    2
                  </div>
                  <h4 className="mb-1 font-medium text-zinc-900 dark:text-white">
                    Test & Verify
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Test the new version in the standby environment before
                    switching traffic.
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-500 dark:bg-sky-900/50">
                    3
                  </div>
                  <h4 className="mb-1 font-medium text-zinc-900 dark:text-white">
                    Switch Traffic
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Instantly switch all traffic to the new version. Rollback
                    instantly if needed.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself blue-green status</span> -
              Show current status
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself blue-green deploy</span> -
              Deploy to standby
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself blue-green switch</span> -
              Switch traffic
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself blue-green rollback</span> -
              Switch back to previous
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function BlueGreenDeployPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <BlueGreenDeployContent />
    </Suspense>
  )
}
