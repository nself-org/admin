'use client'

import { FormSkeleton } from '@/components/skeletons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Key,
  Loader2,
  Lock,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Unlock,
  WifiOff,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface VaultStatus {
  connected: boolean
  sealed: boolean
  initialized: boolean
  version: string | null
  clusterName: string | null
  raw?: string
}

type PageState = 'loading' | 'empty' | 'error' | 'partial' | 'success' | 'offline' | 'unauth'

export default function VaultPage() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [status, setStatus] = useState<VaultStatus | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [configuring, setConfiguring] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [offlineMessage, setOfflineMessage] = useState('')

  // Connection settings form — token is write-only: never pre-populated from API
  const [vaultUrl, setVaultUrl] = useState('http://127.0.0.1:8200')
  const [vaultToken, setVaultToken] = useState('')
  const [vaultNamespace, setVaultNamespace] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  const fetchStatus = useCallback(async () => {
    setPageState('loading')
    setActionError(null)

    try {
      const res = await fetch('/api/config/vault/status')

      if (res.status === 401) {
        setPageState('unauth')
        return
      }

      const data = await res.json()

      if (data.success && data.data) {
        setStatus(data.data)
        setPageState('success')
      } else {
        // Vault unreachable but API itself is up — treat as empty/disconnected
        setStatus({
          connected: false,
          sealed: true,
          initialized: false,
          version: null,
          clusterName: null,
        })
        setPageState('empty')
      }
    } catch (_err) {
      setOfflineMessage('Cannot reach admin API. Check your network connection.')
      setPageState('offline')
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleInit = async () => {
    try {
      setInitializing(true)
      setActionError(null)
      setActionSuccess(null)

      const res = await fetch('/api/config/vault/init', { method: 'POST' })

      if (res.status === 401) {
        setPageState('unauth')
        return
      }

      const data = await res.json()

      if (data.success) {
        setActionSuccess('Vault initialized successfully.')
        await fetchStatus()
      } else {
        setActionError(data.details || data.error || 'Failed to initialize Vault')
      }
    } catch (_err) {
      setActionError('Network error — could not reach admin API.')
    } finally {
      setInitializing(false)
    }
  }

  const handleConfigure = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isDirty) return

    try {
      setConfiguring(true)
      setActionError(null)
      setActionSuccess(null)

      const body: Record<string, string> = { url: vaultUrl }
      // SECURITY: only send token if user typed one — never send empty string (would clear the stored token)
      if (vaultToken) body.token = vaultToken
      if (vaultNamespace) body.namespace = vaultNamespace

      const res = await fetch('/api/config/vault/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.status === 401) {
        setPageState('unauth')
        return
      }

      const data = await res.json()

      if (data.success) {
        setActionSuccess('Vault configuration updated.')
        // SECURITY: clear token field after save — never leave token value in DOM
        setVaultToken('')
        setIsDirty(false)
        await fetchStatus()
      } else {
        setActionError(data.details || data.error || 'Failed to configure Vault')
      }
    } catch (_err) {
      setActionError('Network error — could not reach admin API.')
    } finally {
      setConfiguring(false)
    }
  }

  const getConnectionColor = () => {
    if (!status) return 'text-zinc-500 dark:text-zinc-400'
    if (status.connected && !status.sealed) return 'text-green-600 dark:text-green-400'
    if (status.connected && status.sealed) return 'text-yellow-600 dark:text-yellow-400'
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
    if (status.connected && !status.sealed) return <ShieldCheck className="h-5 w-5" />
    if (status.connected && status.sealed) return <Lock className="h-5 w-5" />
    return <AlertCircle className="h-5 w-5" />
  }

  // --- full-page state renders ---

  if (pageState === 'unauth') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="text-destructive h-10 w-10" />
        <p className="text-lg font-medium">Not authenticated</p>
        <p className="text-muted-foreground text-sm">
          Please log in to manage Vault configuration.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = '/login'
          }}
        >
          Go to Login
        </Button>
      </div>
    )
  }

  if (pageState === 'offline') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <WifiOff className="text-muted-foreground h-10 w-10" />
        <p className="text-lg font-medium">Cannot connect to admin API</p>
        <p className="text-muted-foreground text-sm">{offlineMessage}</p>
        <Button variant="outline" onClick={fetchStatus}>
          Retry
        </Button>
      </div>
    )
  }

  if (pageState === 'loading') {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Shield className="h-6 w-6" />
            Vault Integration
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage HashiCorp Vault for centralized secrets management.
          </p>
        </div>
        <FormSkeleton />
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Shield className="h-6 w-6" />
          Vault Integration
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage HashiCorp Vault for centralized secrets management.
        </p>
      </div>

      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {actionSuccess && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            {actionSuccess}
          </AlertDescription>
        </Alert>
      )}

      {/* Vault Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Vault Status
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchStatus}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">Connection</div>
              <div className={`flex items-center gap-2 font-semibold ${getConnectionColor()}`}>
                {getConnectionIcon()}
                {getConnectionLabel()}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">Initialized</div>
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

            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">Seal Status</div>
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

          {status && (status.version || status.clusterName) && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                <Server className="h-4 w-4" />
                Vault Details
              </h3>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                {status.version && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 dark:text-zinc-400">Version:</span>
                    <span className="font-medium">{status.version}</span>
                  </div>
                )}
                {status.clusterName && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 dark:text-zinc-400">Cluster:</span>
                    <span className="font-medium">{status.clusterName}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Initialize Vault */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-sky-500" />
            Initialize Vault
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Initialize a new Vault instance. This sets up the encryption keys and prepares Vault for
            use. Only needs to be done once per Vault cluster.
          </p>

          {!status?.initialized && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Initialization generates unseal keys and a root token. Store these securely — they
                cannot be recovered if lost.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleInit} disabled={initializing || status?.initialized === true}>
              {initializing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Initialize Vault
                </>
              )}
            </Button>

            {status?.initialized && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                Vault is already initialized
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-600" />
            Connection Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 text-sm">
            Configure the connection to your HashiCorp Vault server.
          </p>

          <form onSubmit={handleConfigure} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vault-url">Vault URL</Label>
              <Input
                id="vault-url"
                type="url"
                value={vaultUrl}
                onChange={(e) => {
                  setVaultUrl(e.target.value)
                  setIsDirty(true)
                }}
                placeholder="http://127.0.0.1:8200"
              />
              <p className="text-muted-foreground text-xs">
                The URL of your Vault server (e.g., http://127.0.0.1:8200)
              </p>
            </div>

            <div className="space-y-2">
              {/* SECURITY: token field is write-only — never pre-populated with stored value */}
              <Label htmlFor="vault-token">
                Access Token
                <span className="text-muted-foreground ml-2 text-xs font-normal">
                  (write-only — leave blank to keep existing)
                </span>
              </Label>
              <Input
                id="vault-token"
                type="password"
                value={vaultToken}
                onChange={(e) => {
                  setVaultToken(e.target.value)
                  setIsDirty(true)
                }}
                placeholder="hvs.xxxxxxxxxxxxx"
                autoComplete="new-password"
              />
              <p className="text-muted-foreground text-xs">
                Root token or service token with appropriate policies. Leave blank to keep the
                currently stored token.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vault-namespace">
                Namespace
                <span className="text-muted-foreground ml-2 text-xs font-normal">(optional)</span>
              </Label>
              <Input
                id="vault-namespace"
                type="text"
                value={vaultNamespace}
                onChange={(e) => {
                  setVaultNamespace(e.target.value)
                  setIsDirty(true)
                }}
                placeholder="admin"
              />
              <p className="text-muted-foreground text-xs">
                Vault Enterprise namespace (leave empty for open-source Vault)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={configuring || !vaultUrl || !isDirty}>
                {configuring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save Configuration
                  </>
                )}
              </Button>

              <a
                href="https://developer.hashicorp.com/vault/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                Vault Documentation
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* CLI Reference */}
      <Card>
        <CardHeader>
          <CardTitle>CLI Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <code className="bg-muted inline-block min-w-[260px] rounded px-2 py-1 font-mono text-xs">
                nself config vault status
              </code>
              <span className="text-muted-foreground">Check Vault connection and seal status</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="bg-muted inline-block min-w-[260px] rounded px-2 py-1 font-mono text-xs">
                nself config vault init
              </code>
              <span className="text-muted-foreground">Initialize a new Vault instance</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="bg-muted inline-block min-w-[260px] rounded px-2 py-1 font-mono text-xs">
                nself config vault config --url &lt;url&gt;
              </code>
              <span className="text-muted-foreground">Configure Vault connection settings</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
