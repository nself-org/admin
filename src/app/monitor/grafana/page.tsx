'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ChartSkeleton } from '@/components/skeletons'
import {
  ArrowLeft,
  BarChart3,
  CheckCircle,
  ExternalLink,
  Settings,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface GrafanaStatus {
  running: boolean
  url: string
  version: string
  dashboards: { name: string; uid: string; url: string }[]
  dataSources: { name: string; type: string; status: 'ok' | 'error' }[]
}

function GrafanaContent() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<GrafanaStatus | null>(null)

  const fetchStatus = useCallback(async () => {
    // No API route available — Grafana status is not exposed via the admin API.
    // Use `nself monitor grafana` to open Grafana directly.
    setStatus(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          </div>
        </div>
      </>
    )
  }

  if (!status) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
            <Link
              href="/monitor"
              className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Monitor
            </Link>
            <h1 className="bg-gradient-to-r from-orange-600 to-yellow-400 bg-clip-text text-4xl font-bold text-transparent dark:from-orange-400 dark:to-yellow-300">
              Grafana Integration
            </h1>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              Grafana status not available
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Grafana status is not exposed via the Admin API. Use the CLI to manage
              Grafana directly.
            </p>
            <p className="mt-4 font-mono text-sm text-orange-500">
              nself monitor grafana
            </p>
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
            href="/monitor"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Monitor
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-orange-600 to-yellow-400 bg-clip-text text-4xl font-bold text-transparent dark:from-orange-400 dark:to-yellow-300">
                Grafana Integration
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Manage Grafana dashboards and data sources
              </p>
            </div>
            {status?.running && status?.url && (
              <a
                href={status.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
              >
                <ExternalLink className="h-4 w-4" />
                Open Grafana
              </a>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                status?.running
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}
            >
              {status?.running ? (
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Grafana Status
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {status?.running ? 'Running' : 'Not Running'} - Version{' '}
                {status?.version}
              </p>
              {status?.url && (
                <p className="font-mono text-sm text-zinc-500">{status.url}</p>
              )}
            </div>
          </div>
        </div>

        {/* Dashboards */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
              <BarChart3 className="h-5 w-5" />
              Dashboards
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {status?.dashboards.map((dashboard) => (
              <a
                key={dashboard.uid}
                href={dashboard.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 transition-colors hover:border-orange-500 hover:bg-orange-50 dark:border-zinc-700 dark:hover:border-orange-500 dark:hover:bg-orange-900/20"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {dashboard.name}
                  </p>
                  <p className="font-mono text-sm text-zinc-500">
                    {dashboard.uid}
                  </p>
                </div>
                <ExternalLink className="h-5 w-5 text-zinc-400" />
              </a>
            ))}
          </div>
        </div>

        {/* Data Sources */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
              <Settings className="h-5 w-5" />
              Data Sources
            </h3>
          </div>
          <div className="space-y-3">
            {status?.dataSources.map((ds) => (
              <div
                key={ds.name}
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      ds.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {ds.name}
                    </p>
                    <p className="text-sm text-zinc-500">{ds.type}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    ds.status === 'ok'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {ds.status === 'ok' ? 'Connected' : 'Error'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CLI Reference */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-orange-500">nself monitor grafana</span> -
              Open Grafana dashboard
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-orange-500">
                nself monitor grafana --status
              </span>{' '}
              - Check Grafana status
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-orange-500">
                nself monitor grafana --import dashboard.json
              </span>{' '}
              - Import dashboard
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function GrafanaPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <GrafanaContent />
    </Suspense>
  )
}
