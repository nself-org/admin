'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ChartSkeleton } from '@/components/skeletons'
import type { DatabaseProfile, PerformanceProfile } from '@/types/performance'
import {
  AlertCircle,
  ArrowLeft,
  Cpu,
  Database,
  HardDrive,
  MemoryStick,
  Network,
  Play,
  RefreshCw,
  Server,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function ProfileContent() {
  const [isRunning, setIsRunning] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean
    profile: PerformanceProfile | null
    dbProfile: DatabaseProfile | null
  }>('/api/performance/profile', fetcher)

  const profile = data?.profile ?? null
  const dbProfile = data?.dbProfile ?? null

  const runProfile = async () => {
    setIsRunning(true)
    try {
      await fetch('/api/performance/profile', { method: 'POST' })
      await mutate()
    } finally {
      setIsRunning(false)
    }
  }

  const formatBytes = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${mb} MB`
  }

  if (error) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-400">
              Failed to load performance profile. Please try again.
            </p>
          </div>
        </div>
      </>
    )
  }

  if (isLoading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
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
            href="/performance"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Performance
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-emerald-600 to-teal-400 bg-clip-text text-4xl font-bold text-transparent dark:from-emerald-400 dark:to-teal-300">
                System Profile
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Detailed system performance analysis
              </p>
            </div>
            <button
              onClick={runProfile}
              disabled={isRunning}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Full Profile
            </button>
          </div>
        </div>

        {/* Profile Summary */}
        {profile && (
          <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Last Profile
              </h3>
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <span>{new Date(profile.timestamp).toLocaleString()}</span>
                <span>Duration: {profile.duration}ms</span>
              </div>
            </div>
          </div>
        )}

        {/* System Resources */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* CPU Details */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                CPU
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Usage</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {profile?.system.cpu.usage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${profile?.system.cpu.usage || 0}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Cores</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {profile?.system.cpu.cores}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Load Average (1m/5m/15m)
                </span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {profile?.system.cpu.loadAvg.join(' / ')}
                </span>
              </div>
            </div>
          </div>

          {/* Memory Details */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <MemoryStick className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Memory
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Usage</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {profile?.system.memory.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-2 rounded-full bg-green-500 transition-all"
                  style={{
                    width: `${profile?.system.memory.percentage || 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Used</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {formatBytes(profile?.system.memory.used || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Total</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {formatBytes(profile?.system.memory.total || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Disk Details */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <HardDrive className="h-5 w-5 text-sky-500 dark:text-sky-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Disk
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Usage</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {profile?.system.disk.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-2 rounded-full bg-sky-500 transition-all"
                  style={{ width: `${profile?.system.disk.percentage || 0}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Used</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {formatBytes(profile?.system.disk.used || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Free</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {formatBytes(profile?.system.disk.free || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Network Details */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Network className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Network
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Bytes In
                </span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {formatBytes((profile?.system.network.bytesIn || 0) / 1024)}/s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Bytes Out
                </span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {formatBytes((profile?.system.network.bytesOut || 0) / 1024)}
                  /s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Packets In
                </span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {profile?.system.network.packetsIn.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Packets Out
                </span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {profile?.system.network.packetsOut.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Database Profile */}
        {dbProfile && (
          <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                <Database className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Database Performance
              </h3>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Connections
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                  {dbProfile.connections.active} / {dbProfile.connections.max}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {dbProfile.connections.idle} idle
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Cache Hit Ratio
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                  {dbProfile.cacheHitRatio.toFixed(1)}%
                </p>
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  Excellent
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Transactions/sec
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                  {dbProfile.transactionsPerSecond}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Avg Query Time
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                  {dbProfile.avgQueryTime.toFixed(1)}ms
                </p>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Slow Queries
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                  {dbProfile.slowQueries}
                </p>
                <Link
                  href="/performance/queries"
                  className="mt-1 text-sm text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  View details
                </Link>
              </div>
              <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Deadlocks
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                  {dbProfile.deadlocks}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Service Performance */}
        {profile && profile.services.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <Server className="h-5 w-5 text-sky-500 dark:text-sky-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Service Performance
              </h3>
            </div>
            <div className="space-y-4">
              {profile.services.map((service) => (
                <div
                  key={service.name}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-medium text-zinc-900 dark:text-white">
                      {service.name}
                    </h4>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        (service.errorRate || 0) < 0.01
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {(service.errorRate || 0) < 0.01 ? 'Healthy' : 'Warning'}
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        CPU
                      </p>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {service.cpu.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Memory
                      </p>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {service.memory.used}MB / {service.memory.limit}MB
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Avg Response
                      </p>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {service.responseTime?.avg.toFixed(1)}ms
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Req/s
                      </p>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {service.requestsPerSecond}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <ProfileContent />
    </Suspense>
  )
}
