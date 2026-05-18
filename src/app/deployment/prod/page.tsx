'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface ProductionStatus {
  configured: boolean
  environment?: string
  domain?: string
  sslEnabled?: boolean
  sslExpiry?: string
  secretsConfigured?: boolean
  hasuraConsoleDisabled?: boolean
  debugDisabled?: boolean
}

interface ActionResult {
  success: boolean
  output?: string
  error?: string
}

function ProductionContent() {
  const [status, setStatus] = useState<ProductionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<ActionResult | null>(null)

  // Form states
  const [showInitForm, setShowInitForm] = useState(false)
  const [initDomain, setInitDomain] = useState('')
  const [initEmail, setInitEmail] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/deploy/production')
      const data = await response.json()

      if (data.success) {
        const output = data.status || ''
        const isConfigured = !output.includes('not-configured') && !output.includes('not found')

        setStatus({
          configured: isConfigured,
          environment: extractValue(output, 'ENV') || extractValue(output, 'environment'),
          domain: extractValue(output, 'domain') || extractValue(output, 'BASE_DOMAIN'),
          sslEnabled: output.includes('SSL_ENABLED=true') || output.includes('SSL: enabled'),
          secretsConfigured:
            output.includes('secrets: configured') || output.includes('.env.secrets: found'),
          hasuraConsoleDisabled:
            output.includes('console: disabled') || output.includes('HASURA.*CONSOLE.*false'),
          debugDisabled: output.includes('DEBUG=false') || !output.includes('DEBUG=true'),
        })
      }
    } catch (error) {
      console.error('Failed to fetch production status:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const extractValue = (text: string, key: string): string | undefined => {
    const match = text.match(new RegExp(`${key}[=:\\s]+([^\\n\\s]+)`, 'i'))
    return match?.[1]
  }

  const executeAction = async (action: string, options: Record<string, unknown> = {}) => {
    setActionLoading(action)
    setActionResult(null)

    try {
      const response = await fetch('/api/deploy/production', {
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
    })
    setShowInitForm(false)
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
          <h1 className="bg-gradient-to-r from-red-600 to-orange-400 bg-clip-text text-4xl font-bold text-transparent dark:from-red-400 dark:to-orange-300">
            Production Environment
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Security hardening, SSL certificates, and production deployment
          </p>
        </div>

        {/* Status Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-4">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Config</p>
                <p
                  className={`font-semibold ${status?.configured ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}
                >
                  {status?.configured ? 'Ready' : 'Pending'}
                </p>
              </div>
            </div>
          </div>

          {/* SSL Status */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${status?.sslEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
              >
                <svg
                  className={`h-5 w-5 ${status?.sslEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">SSL</p>
                <p
                  className={`font-semibold ${status?.sslEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {status?.sslEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </div>

          {/* Secrets Status */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${status?.secretsConfigured ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
              >
                <svg
                  className={`h-5 w-5 ${status?.secretsConfigured ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Secrets</p>
                <p
                  className={`font-semibold ${status?.secretsConfigured ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {status?.secretsConfigured ? 'Configured' : 'Missing'}
                </p>
              </div>
            </div>
          </div>

          {/* Debug Status */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${status?.debugDisabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
              >
                <svg
                  className={`h-5 w-5 ${status?.debugDisabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Debug</p>
                <p
                  className={`font-semibold ${status?.debugDisabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {status?.debugDisabled ? 'Off' : 'On'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Domain Info */}
        {status?.domain && (
          <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Production Domain
            </h3>
            <p className="font-mono text-xl text-zinc-900 dark:text-white">{status.domain}</p>
          </div>
        )}

        {/* Init Form */}
        {showInitForm && (
          <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Initialize Production Environment
            </h3>
            <form onSubmit={handleInit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Production Domain *
                </label>
                <input
                  type="text"
                  value={initDomain}
                  onChange={(e) => setInitDomain(e.target.value)}
                  placeholder="example.com"
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
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!initDomain || actionLoading === 'init'}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === 'init' ? 'Initializing...' : 'Initialize Production'}
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
          {/* Setup Actions */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Setup & Configuration
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
                  Initialize Production
                </button>
              )}

              <button
                onClick={() => executeAction('secrets', { secretAction: 'generate' })}
                disabled={actionLoading !== null}
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
                {actionLoading === 'secrets' ? 'Generating...' : 'Generate Production Secrets'}
              </button>

              <button
                onClick={() => executeAction('secrets', { secretAction: 'validate' })}
                disabled={actionLoading !== null}
                className="flex items-center gap-3 rounded-lg border border-zinc-300 px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {actionLoading === 'secrets-validate' ? 'Validating...' : 'Validate Secrets'}
              </button>
            </div>
          </div>

          {/* SSL Actions */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              SSL Certificates
            </h3>
            <div className="grid gap-3">
              <button
                onClick={() => executeAction('ssl', { sslAction: 'status' })}
                disabled={actionLoading !== null}
                className="flex items-center gap-3 rounded-lg border border-zinc-300 px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                {actionLoading === 'ssl-status' ? 'Checking...' : 'Check SSL Status'}
              </button>

              <button
                onClick={() =>
                  executeAction('ssl', {
                    sslAction: 'request',
                    domain: status?.domain,
                  })
                }
                disabled={!status?.domain || actionLoading !== null}
                className="flex items-center gap-3 rounded-lg border border-zinc-300 px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                {actionLoading === 'ssl-request'
                  ? 'Requesting...'
                  : "Request Let's Encrypt Certificate"}
              </button>

              <button
                onClick={() => executeAction('ssl', { sslAction: 'renew' })}
                disabled={actionLoading !== null}
                className="flex items-center gap-3 rounded-lg border border-zinc-300 px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {actionLoading === 'ssl-renew' ? 'Renewing...' : 'Renew SSL Certificate'}
              </button>
            </div>
          </div>

          {/* Security Actions */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Security</h3>
            <div className="grid gap-3">
              <button
                onClick={() => executeAction('check', { verbose: true })}
                disabled={actionLoading !== null}
                className="flex items-center gap-3 rounded-lg border border-zinc-300 px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                {actionLoading === 'check' ? 'Auditing...' : 'Run Security Audit'}
              </button>

              <button
                onClick={() => executeAction('firewall', { firewallAction: 'status' })}
                disabled={actionLoading !== null}
                className="flex items-center gap-3 rounded-lg border border-zinc-300 px-4 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                {actionLoading === 'firewall-status' ? 'Checking...' : 'Check Firewall Status'}
              </button>

              <button
                onClick={() => executeAction('harden', { dryRun: true })}
                disabled={actionLoading !== null}
                className="flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 font-medium text-yellow-700 transition-colors hover:bg-yellow-100 disabled:opacity-50 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                {actionLoading === 'harden-dry' ? 'Running...' : 'Preview Hardening (Dry Run)'}
              </button>

              <button
                onClick={() => executeAction('harden')}
                disabled={actionLoading !== null}
                className="flex items-center gap-3 rounded-lg bg-orange-600 px-4 py-3 font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                {actionLoading === 'harden' ? 'Hardening...' : 'Apply Security Hardening'}
              </button>
            </div>
          </div>

          {/* Deployment Actions */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Deployment</h3>
            <div className="grid gap-3">
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
                onClick={() => executeAction('deploy', { rolling: true })}
                disabled={!status?.configured || actionLoading !== null}
                className="flex items-center gap-3 rounded-lg bg-red-600 px-4 py-3 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                {actionLoading === 'deploy' ? 'Deploying...' : 'Deploy to Production (Rolling)'}
              </button>
            </div>
          </div>
        </div>

        {/* Production Checklist */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            Production Checklist
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={`h-5 w-5 rounded-full ${status?.configured ? 'bg-green-500' : 'bg-zinc-300'}`}
              >
                {status?.configured && (
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span className="text-zinc-700 dark:text-zinc-300">
                Initialize production environment
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`h-5 w-5 rounded-full ${status?.secretsConfigured ? 'bg-green-500' : 'bg-zinc-300'}`}
              >
                {status?.secretsConfigured && (
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span className="text-zinc-700 dark:text-zinc-300">Generate production secrets</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`h-5 w-5 rounded-full ${status?.sslEnabled ? 'bg-green-500' : 'bg-zinc-300'}`}
              >
                {status?.sslEnabled && (
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span className="text-zinc-700 dark:text-zinc-300">Configure SSL certificates</span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`h-5 w-5 rounded-full ${status?.debugDisabled ? 'bg-green-500' : 'bg-zinc-300'}`}
              >
                {status?.debugDisabled && (
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span className="text-zinc-700 dark:text-zinc-300">Disable debug mode</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-zinc-300" />
              <span className="text-zinc-700 dark:text-zinc-300">Run security audit</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-zinc-300" />
              <span className="text-zinc-700 dark:text-zinc-300">Deploy to production</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function ProductionPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <ProductionContent />
    </Suspense>
  )
}
