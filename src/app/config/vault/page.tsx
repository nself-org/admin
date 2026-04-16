'use client'

import { PageTemplate } from '@/components/PageTemplate'
import { FormSkeleton } from '@/components/skeletons'
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Key,
  Lock,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Unlock,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

interface VaultStatus {
  connected: boolean
  sealed: boolean
  initialized: boolean
  version: string | null
  clusterName: string | null
  raw?: string
}

function VaultContent() {
  const [status, setStatus] = useState<VaultStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(false)
  const [configuring, setConfiguring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Connection settings form
  const [vaultUrl, setVaultUrl] = useState('http://127.0.0.1:8200')
  const [vaultToken, setVaultToken] = useState('')
  const [vaultNamespace, setVaultNamespace] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/config/vault/status')
      const data = await res.json()

      if (data.success) {
        setStatus(data.data)
      } else {
        setStatus({
          connected: false,
          sealed: true,
          initialized: false,
          version: null,
          clusterName: null,
        })
      }
    } catch (_err) {
      setError('Failed to fetch Vault status')
      setStatus({
        connected: false,
        sealed: true,
        initialized: false,
        version: null,
        clusterName: null,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleInit = async () => {
    try {
      setInitializing(true)
      setError(null)
      setSuccessMessage(null)

      const res = await fetch('/api/config/vault/init', {
        method: 'POST',
      })
      const data = await res.json()

      if (data.success) {
        setSuccessMessage('Vault initialized successfully!')
        await fetchStatus()
      } else {
        setError(data.details || data.error || 'Failed to initialize Vault')
      }
    } catch (_err) {
      setError('Failed to initialize Vault')
    } finally {
      setInitializing(false)
    }
  }

  const handleConfigure = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setConfiguring(true)
      setError(null)
      setSuccessMessage(null)

      const res = await fetch('/api/config/vault/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: vaultUrl,
          token: vaultToken || undefined,
          namespace: vaultNamespace || undefined,
        }),
      })
      const data = await res.json()

      if (data.success) {
        setSuccessMessage('Vault configuration updated successfully!')
        setVaultToken('')
        await fetchStatus()
      } else {
        setError(data.details || data.error || 'Failed to configure Vault')
      }
    } catch (_err) {
      setError('Failed to configure Vault')
    } finally {
      setConfiguring(false)
    }
  }

  const getConnectionColor = () => {
    if (!status) return 'text-zinc-500 dark:text-zinc-400'
    if (status.connected && !status.sealed)
      return 'text-green-600 dark:text-green-400'
    if (status.connected && status.sealed)
      return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConnectionLabel = () => {
    if (!status) return 'Unknown'
    if (status.connected && !status.sealed) return 'Connected & Unsealed'
    if (status.connected && status.sealed) return 'Connected but Sealed'
    return 'Disconnected'
  }

  const getConnectionIcon = () => {
    if (!status) return <AlertCircle className="h-5 w-5" />
    if (status.connected && !status.sealed)
      return <ShieldCheck className="h-5 w-5" />
    if (status.connected && status.sealed) return <Lock className="h-5 w-5" />
    return <AlertCircle className="h-5 w-5" />
  }

  return (
    <PageTemplate
      title="Vault Integration"
      description="Manage HashiCorp Vault for centralized secrets management"
    >
      <div className="space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <div className="text-sm whitespace-pre-wrap text-red-800 dark:text-red-200">
              {error}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
            <div className="text-sm text-green-800 dark:text-green-200">
              {successMessage}
            </div>
          </div>
        )}

        {/* Vault Status Card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Vault Status
            </h2>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {/* Connection Status */}
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Connection
                </div>
                <div
                  className={`flex items-center gap-2 font-semibold ${getConnectionColor()}`}
                >
                  {getConnectionIcon()}
                  {getConnectionLabel()}
                </div>
              </div>

              {/* Initialized Status */}
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Initialized
                </div>
                <div
                  className={`flex items-center gap-2 font-semibold ${
                    status?.initialized
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {status?.initialized ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Yes
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5" />
                      No
                    </>
                  )}
                </div>
              </div>

              {/* Seal Status */}
              <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Seal Status
                </div>
                <div
                  className={`flex items-center gap-2 font-semibold ${
                    status?.sealed
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {status?.sealed ? (
                    <>
                      <Lock className="h-5 w-5" />
                      Sealed
                    </>
                  ) : (
                    <>
                      <Unlock className="h-5 w-5" />
                      Unsealed
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Additional Info */}
          {status && (status.version || status.clusterName) && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                <Server className="h-4 w-4" />
                Vault Details
              </h3>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                {status.version && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Version:
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {status.version}
                    </span>
                  </div>
                )}
                {status.clusterName && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      Cluster:
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {status.clusterName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Initialize Vault */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
            <Key className="h-5 w-5 text-sky-500 dark:text-sky-400" />
            Initialize Vault
          </h2>

          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Initialize a new Vault instance. This sets up the encryption keys
            and prepares Vault for use. Only needs to be done once per Vault
            cluster.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleInit}
              disabled={initializing || status?.initialized === true}
              className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {initializing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Initialize Vault
                </>
              )}
            </button>

            {status?.initialized && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                Vault is already initialized
              </span>
            )}
          </div>

          {!status?.initialized && (
            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Important:</strong> Initialization generates unseal keys
                and a root token. Store these securely - they cannot be
                recovered if lost.
              </p>
            </div>
          )}
        </div>

        {/* Connection Settings */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
            <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Connection Settings
          </h2>

          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Configure the connection to your HashiCorp Vault server. These
            settings determine how nself communicates with Vault.
          </p>

          <form onSubmit={handleConfigure} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Vault URL
              </label>
              <input
                type="url"
                value={vaultUrl}
                onChange={(e) => setVaultUrl(e.target.value)}
                placeholder="http://127.0.0.1:8200"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                The URL of your Vault server (e.g., http://127.0.0.1:8200)
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Access Token
              </label>
              <input
                type="password"
                value={vaultToken}
                onChange={(e) => setVaultToken(e.target.value)}
                placeholder="hvs.xxxxxxxxxxxxx"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Root token or service token with appropriate policies
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Namespace{' '}
                <span className="text-zinc-400 dark:text-zinc-500">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                value={vaultNamespace}
                onChange={(e) => setVaultNamespace(e.target.value)}
                placeholder="admin"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Vault Enterprise namespace (leave empty for open-source Vault)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={configuring || !vaultUrl}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {configuring ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Save Configuration
                  </>
                )}
              </button>

              <a
                href="https://developer.hashicorp.com/vault/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                Vault Documentation
              </a>
            </div>
          </form>
        </div>

        {/* CLI Reference */}
        <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-6 shadow-sm dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <code className="inline-block min-w-[260px] rounded bg-zinc-100 px-2 py-1 font-mono text-xs dark:bg-zinc-700">
                nself config vault status
              </code>
              <span className="text-zinc-600 dark:text-zinc-400">
                Check Vault connection and seal status
              </span>
            </div>
            <div className="flex items-start gap-3">
              <code className="inline-block min-w-[260px] rounded bg-zinc-100 px-2 py-1 font-mono text-xs dark:bg-zinc-700">
                nself config vault init
              </code>
              <span className="text-zinc-600 dark:text-zinc-400">
                Initialize a new Vault instance
              </span>
            </div>
            <div className="flex items-start gap-3">
              <code className="inline-block min-w-[260px] rounded bg-zinc-100 px-2 py-1 font-mono text-xs dark:bg-zinc-700">
                nself config vault config --url &lt;url&gt;
              </code>
              <span className="text-zinc-600 dark:text-zinc-400">
                Configure Vault connection settings
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageTemplate>
  )
}

export default function VaultPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <VaultContent />
    </Suspense>
  )
}
