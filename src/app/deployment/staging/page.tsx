'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface StagingStatus {
  configured: boolean
  connected: boolean
  lastDeploy?: string
  health?: 'healthy' | 'unhealthy' | 'unknown'
  serverConfig?: {
    host?: string
    user?: string
    deployPath?: string
  }
}

interface ActionResult {
  success: boolean
  output?: string
  error?: string
}

function StagingContent() {
  const [status, setStatus] = useState<StagingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<ActionResult | null>(null)

  // Form states for init
  const [showInitForm, setShowInitForm] = useState(false)
  const [initDomain, setInitDomain] = useState('')
  const [initEmail, setInitEmail] = useState('')
  const [initServer, setInitServer] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/deploy/staging')
      const data = await response.json()

      if (data.success) {
        // Parse CLI output to determine status
        const output = data.status || ''
        const isConfigured = !output.includes('not-configured') && !output.includes('not found')

        setStatus({
          configured: isConfigured,
          connected: output.includes('connected') || output.includes('reachable'),
          health: output.includes('healthy')
            ? 'healthy'
            : output.includes('unhealthy')
              ? 'unhealthy'
              : 'unknown',
          serverConfig: {
            host: extractValue(output, 'host'),
            user: extractValue(output, 'user'),
            deployPath: extractValue(output, 'path'),
          },
        })
      }
    } catch (error) {
      console.error('Failed to fetch staging status:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const extractValue = (text: string, key: string): string | undefined => {
    const match = text.match(new RegExp(`${key}[:\\s]+([^\\n\\s]+)`, 'i'))
    return match?.[1]
  }

  const executeAction = async (action: string, options: Record<string, unknown> = {}) => {
    setActionLoading(action)
    setActionResult(null)

    try {
      const response = await fetch('/api/deploy/staging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, options }),
      })
      const data = await response.json()

      setActionResult({
        success: data.success,
        output: data.output || data.stderr,
        error: data.error || data.details,
      })

      if (data.success) {
        fetchStatus()
      }
    } catch (error) {
      setActionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault()
    await executeAction('init', {
      domain: initDomain,
      email: initEmail || undefined,
      server: initServer || undefined,
    })
    setShowInitForm(false)
  }

  if (loading) {
    return (
      <>
        <h1 className="sr-only">Staging Environment</h1>
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
          <h1 className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-blue-400 dark:to-white">
            Staging Environment
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Deploy, test, and manage your staging environment
          </p>
        </div>

        {/* Status Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          {/* Configuration Status */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${status?.configured ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}
              >
                <svg
                  className={`h-5 w-5 ${status?.configured ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Configuration</p>
                <p
                  className={`font-semibold ${status?.configured ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}
                >
                  {status?.configured ? 'Configured' : 'Not Configured'}
                </p>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${status?.connected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
              >
                <svg
                  className={`h-5 w-5 ${status?.connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Connection</p>
                <p
                  className={`font-semibold ${status?.connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {status?.connected ? 'Connected' : 'Not Connected'}
                </p>
              </div>
            </div>
          </div>

          {/* Health Status */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${status?.health === 'healthy' ? 'bg-green-100 dark:bg-green-900/30' : status?.health === 'unhealthy' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-zinc-100 dark:bg-zinc-700'}`}
              >
                <svg
                  className={`h-5 w-5 ${status?.health === 'healthy' ? 'text-green-600 dark:text-green-400' : status?.health === 'unhealthy' ? 'text-red-600 dark:text-red-400' : 'text-zinc-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Health</p>
                <p
                  className={`font-semibold capitalize ${status?.health === 'healthy' ? 'text-green-600 dark:text-green-400' : status?.health === 'unhealthy' ? 'text-red-600 dark:text-red-400' : 'text-zinc-500'}`}
                >
                  {status?.health || 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Server Config */}
        {status?.serverConfig?.host && (
          <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Server Configuration
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Host</p>
                <p className="font-mono text-zinc-900 dark:text-white">
                  {status.serverConfig.host}
                </p>
              </div>
              {status.serverConfig.user && (
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">User</p>
                  <p className="font-mono text-zinc-900 dark:text-white">
                    {status.serverConfig.user}
                  </p>
                </div>
              )}
              {status.serverConfig.deployPath && (
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Deploy Path</p>
                  <p className="font-mono text-zinc-900 dark:text-white">
                    {status.serverConfig.deployPath}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Init Form */}
        {showInitForm && (
          <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Initialize Staging Environment
            </h3>
            <form onSubmit={handleInit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Staging Domain *
                </label>
                <input
                  type="text"
                  value={initDomain}
                  onChange={(e) => setInitDomain(e.target.value)}
                  placeholder="staging.example.com"
                  required
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  SSL Certificate Email
                </label>
                <input
                  type="email"
                  value={initEmail}
                  onChange={(e) => setInitEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  SSH Server Host
                </label>
                <input
                  type="text"
                  value={initServer}
                  onChange={(e) => setInitServer(e.target.value)}
                  placeholder="staging.example.com"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!initDomain || actionLoading === 'init'}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === 'init' ? 'Initializing...' : 'Initialize Staging'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInitForm(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Action Result */}
        {actionResult && (
          <div
            className={`mb-8 rounded-xl border p-6 ${actionResult.success ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'}`}
          >
            <div className="flex items-start gap-3">
              {actionResult.success ? (
                <svg
                  className="h-5 w-5 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              <div className="flex-1">
                <p
                  className={`font-medium ${actionResult.success ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}`}
                >
                  {actionResult.success ? 'Success' : 'Error'}
                </p>
                {(actionResult.output || actionResult.error) && (
                  <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-zinc-900 p-4 font-mono text-sm whitespace-pre-wrap text-zinc-100">
                    {actionResult.output || actionResult.error}
                  </pre>
                )}
              </div>
              <button
                onClick={() => setActionResult(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Actions */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Quick Actions
            </h3>
            <div className="grid gap-3">
              {!status?.configured && (
                <button
                  onClick={() => setShowInitForm(true)}
                  className="flex items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Initialize Staging Environment
                </button>
              )}

              <button
                onClick={() => executeAction('deploy', { dryRun: true })}
                disabled={!status?.configured || actionLoading !== null}
                className="flex items-center gap-3 rounded-lg border border-zinc-300 px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {actionLoading === 'deploy-dry' ? 'Running...' : 'Preview Deploy (Dry Run)'}
              </button>

              <button
                onClick={() => executeAction('deploy', { force: true })}
                disabled={!status?.configured || actionLoading !== null}
                className="flex items-center gap-3 rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                {actionLoading === 'deploy' ? 'Deploying...' : 'Deploy to Staging'}
              </button>

              <button
                onClick={() => executeAction('logs', { lines: 100 })}
                disabled={!status?.configured || actionLoading !== null}
                className="flex items-center gap-3 rounded-lg border border-zinc-300 px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {actionLoading === 'logs' ? 'Fetching...' : 'View Logs'}
              </button>
            </div>
          </div>

          {/* Advanced Actions */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Advanced Actions
            </h3>
            <div className="grid gap-3">
              <button
                onClick={() => executeAction('secrets', { secretAction: 'generate' })}
                disabled={!status?.configured || actionLoading !== null}
                className="flex items-center gap-3 rounded-lg border border-zinc-300 px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                {actionLoading === 'secrets' ? 'Generating...' : 'Generate Secrets'}
              </button>

              <button
                onClick={() => executeAction('seed')}
                disabled={!status?.configured || actionLoading !== null}
                className="flex items-center gap-3 rounded-lg border border-zinc-300 px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
                {actionLoading === 'seed' ? 'Seeding...' : 'Seed Database'}
              </button>

              <button
                onClick={() => executeAction('reset', { force: true })}
                disabled={!status?.configured || actionLoading !== null}
                className="flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 font-medium text-yellow-700 transition-colors hover:bg-yellow-100 disabled:opacity-50 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {actionLoading === 'reset' ? 'Resetting...' : 'Reset Environment'}
              </button>

              <button
                onClick={() => executeAction('reset', { data: true, force: true })}
                disabled={!status?.configured || actionLoading !== null}
                className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                {actionLoading === 'reset-data' ? 'Resetting...' : 'Reset with Data (Destructive)'}
              </button>
            </div>
          </div>
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself staging init</span> &lt;domain&gt; - Initialize
              staging environment
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself staging deploy</span> - Deploy to staging
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself staging status</span> - Check staging status
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself staging logs</span> [service] - View logs
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself staging shell</span> - SSH to staging server
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-blue-500">nself staging reset</span> --data - Reset with data
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function StagingPage() {
  return (
    <Suspense
      fallback={
        <div>
          <h1 className="sr-only">Staging Environment</h1>
          <FormSkeleton />
        </div>
      }
    >
      <StagingContent />
    </Suspense>
  )
}
