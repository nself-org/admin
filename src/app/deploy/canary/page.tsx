'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import type { CanaryDeployment } from '@/types/deployment'
import { AlertTriangle, ArrowLeft, CheckCircle, Play, RefreshCw, XCircle } from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

function CanaryDeployContent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [canary, setCanary] = useState<CanaryDeployment | null>(null)
  const [trafficPercentage, setTrafficPercentage] = useState(10)

  const fetchCanary = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/deploy/canary')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCanary(data.canary ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load canary status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCanary()
  }, [fetchCanary])

  const startCanary = async () => {
    setActionLoading('start')
    try {
      await fetch('/api/deploy/canary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', trafficPercentage }),
      })
      await fetchCanary()
    } finally {
      setActionLoading(null)
    }
  }

  const updateTraffic = async (percentage: number) => {
    setActionLoading('traffic')
    try {
      await fetch('/api/deploy/canary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          trafficPercentage: percentage,
        }),
      })
      await fetchCanary()
    } finally {
      setActionLoading(null)
    }
  }

  const promoteCanary = async () => {
    setActionLoading('promote')
    try {
      await fetch('/api/deploy/canary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'promote' }),
      })
      await fetchCanary()
    } finally {
      setActionLoading(null)
    }
  }

  const rollbackCanary = async () => {
    setActionLoading('rollback')
    try {
      await fetch('/api/deploy/canary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback' }),
      })
      await fetchCanary()
    } finally {
      setActionLoading(null)
    }
  }

  const getMetricStatus = (newValue: number, currentValue: number, lowerIsBetter: boolean) => {
    const diff = newValue - currentValue
    const percentDiff = Math.abs(diff / currentValue) * 100
    if (percentDiff < 5) return 'neutral'
    return lowerIsBetter ? (diff < 0 ? 'good' : 'bad') : diff > 0 ? 'good' : 'bad'
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent" />
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={fetchCanary}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
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
          <h1 className="bg-gradient-to-r from-yellow-600 to-orange-400 bg-clip-text text-4xl font-bold text-transparent dark:from-yellow-400 dark:to-orange-300">
            Canary Deployment
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Gradually roll out changes to a subset of users
          </p>
        </div>

        {canary ? (
          <>
            {/* Status */}
            <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Canary Status
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      canary.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : canary.status === 'promoted'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {canary.status.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-sm text-zinc-500">
                  Started {new Date(canary.startedAt).toLocaleString()}
                </span>
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Current Version</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {canary.currentVersion}
                  </p>
                  <p className="text-sm text-zinc-500">{100 - canary.trafficPercentage}% traffic</p>
                </div>
                <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Canary Version</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {canary.newVersion}
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    {canary.trafficPercentage}% traffic
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Traffic Split</p>
                  <div className="mt-2 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-4 rounded-full bg-yellow-500 transition-all"
                      style={{ width: `${canary.trafficPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Traffic Control */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Adjust Traffic Percentage
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={canary.trafficPercentage}
                    onChange={(e) =>
                      setCanary({
                        ...canary,
                        trafficPercentage: parseInt(e.target.value),
                      })
                    }
                    className="flex-1"
                  />
                  <span className="w-16 text-center font-medium">{canary.trafficPercentage}%</span>
                  <button
                    onClick={() => updateTraffic(canary.trafficPercentage)}
                    disabled={actionLoading !== null}
                    className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {actionLoading === 'traffic' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Update'
                    )}
                  </button>
                </div>
              </div>

              {/* Metrics */}
              {canary.metrics && (
                <div className="mb-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                    <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">Error Rate</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">
                          {(canary.metrics.errorRate.new * 100).toFixed(2)}%
                        </p>
                        <p className="text-xs text-zinc-500">
                          Current: {(canary.metrics.errorRate.current * 100).toFixed(2)}%
                        </p>
                      </div>
                      {getMetricStatus(
                        canary.metrics.errorRate.new,
                        canary.metrics.errorRate.current,
                        true
                      ) === 'bad' ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                    <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">Latency (ms)</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">
                          {canary.metrics.latency.new}ms
                        </p>
                        <p className="text-xs text-zinc-500">
                          Current: {canary.metrics.latency.current}ms
                        </p>
                      </div>
                      {getMetricStatus(
                        canary.metrics.latency.new,
                        canary.metrics.latency.current,
                        true
                      ) === 'bad' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                    <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">Success Rate</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">
                          {canary.metrics.successRate.new.toFixed(1)}%
                        </p>
                        <p className="text-xs text-zinc-500">
                          Current: {canary.metrics.successRate.current.toFixed(1)}%
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={promoteCanary}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === 'promote' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Promote to 100%
                </button>
                <button
                  onClick={rollbackCanary}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {actionLoading === 'rollback' ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Rollback
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              No Active Canary
            </h3>
            <p className="mb-6 text-zinc-600 dark:text-zinc-400">
              Start a canary deployment to gradually roll out changes.
            </p>
            <div className="mx-auto mb-6 max-w-md">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Initial Traffic Percentage
              </label>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={trafficPercentage}
                onChange={(e) => setTrafficPercentage(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-center text-sm text-zinc-500">{trafficPercentage}%</p>
            </div>
            <button
              onClick={startCanary}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-yellow-700 disabled:opacity-50"
            >
              {actionLoading === 'start' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start Canary Deployment
            </button>
          </div>
        )}

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-yellow-500">nself canary start --traffic=10</span> - Start
              canary deployment
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-yellow-500">nself canary status</span> - Check canary status
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-yellow-500">nself canary promote</span> - Promote canary to 100%
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-yellow-500">nself canary rollback</span> - Rollback canary
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function CanaryDeployPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <CanaryDeployContent />
    </Suspense>
  )
}
