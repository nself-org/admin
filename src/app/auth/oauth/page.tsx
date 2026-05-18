'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Play,
  Power,
  PowerOff,
  RefreshCw,
  Settings,
  Shield,
  Terminal,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useEffect, useState } from 'react'

// -- Types --

interface ProviderInfo {
  id: string
  name: string
  installed: boolean
  enabled: boolean
  configured: boolean
}

interface CLIOutput {
  command: string
  output: string
  success: boolean
  timestamp: string
}

interface ConfigFormData {
  clientId: string
  clientSecret: string
  redirectUri: string
}

// -- Constants --

const PROVIDERS: { id: string; name: string }[] = [
  { id: 'google', name: 'Google' },
  { id: 'github', name: 'GitHub' },
  { id: 'microsoft', name: 'Microsoft' },
  { id: 'slack', name: 'Slack' },
  { id: 'apple', name: 'Apple' },
  { id: 'twitter', name: 'Twitter' },
  { id: 'discord', name: 'Discord' },
  { id: 'linkedin', name: 'LinkedIn' },
]

// -- Helper Components --

function ProviderIcon({ provider }: { provider: string }) {
  const letter = provider.charAt(0).toUpperCase()
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-lg font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
      {letter}
    </div>
  )
}

function StatusBadge({
  installed,
  enabled,
  configured,
}: {
  installed: boolean
  enabled: boolean
  configured: boolean
}) {
  if (!installed) {
    return <Badge variant="outline">Not Installed</Badge>
  }
  if (!configured) {
    return (
      <Badge className="border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
        Not Configured
      </Badge>
    )
  }
  if (enabled) {
    return (
      <Badge className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
        Enabled
      </Badge>
    )
  }
  return (
    <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
      Disabled
    </Badge>
  )
}

function CommandPreview({ command }: { command: string }) {
  if (!command) return null
  return (
    <div className="rounded-lg bg-zinc-900 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Terminal className="h-3.5 w-3.5" />
        <span>Command Preview</span>
      </div>
      <pre className="mt-1 font-mono text-sm text-green-400">{command}</pre>
    </div>
  )
}

// -- Main Component --

function OAuthManagementContent() {
  const [providers, setProviders] = useState<ProviderInfo[]>(
    PROVIDERS.map((p) => ({
      ...p,
      installed: false,
      enabled: false,
      configured: false,
    }))
  )
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [cliOutputs, setCliOutputs] = useState<CLIOutput[]>([])
  const [error, setError] = useState<string | null>(null)

  // Config dialog state
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [configProvider, setConfigProvider] = useState<string | null>(null)
  const [configForm, setConfigForm] = useState<ConfigFormData>({
    clientId: '',
    clientSecret: '',
    redirectUri: '',
  })
  const [configLoading, setConfigLoading] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [commandPreview, setCommandPreview] = useState('')

  // -- Helpers --

  const addOutput = useCallback((command: string, output: string, success: boolean) => {
    setCliOutputs((prev) => [
      {
        command,
        output,
        success,
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 49),
    ])
  }, [])

  const parseProviderStatus = useCallback((output: string): Partial<ProviderInfo>[] => {
    // Try to parse JSON output from CLI
    try {
      const parsed = JSON.parse(output)
      if (Array.isArray(parsed)) {
        return parsed
      }
      if (parsed.providers && Array.isArray(parsed.providers)) {
        return parsed.providers
      }
    } catch {
      // Not JSON, try line-by-line parsing
    }

    // Fallback: parse text output line by line
    const results: Partial<ProviderInfo>[] = []
    const lines = output.split('\n').filter((l) => l.trim())
    for (const line of lines) {
      const lower = line.toLowerCase()
      for (const p of PROVIDERS) {
        if (lower.includes(p.id)) {
          results.push({
            id: p.id,
            installed: lower.includes('installed') || lower.includes('enabled'),
            enabled: lower.includes('enabled') && !lower.includes('disabled'),
            configured: lower.includes('configured') || lower.includes('enabled'),
          })
        }
      }
    }
    return results
  }, [])

  // -- Data Fetching --

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/oauth/status')
      const json = await response.json()

      if (json.success && json.data?.output) {
        addOutput('nself auth oauth status', json.data.output, true)
        const statusData = parseProviderStatus(json.data.output)

        setProviders((prev) =>
          prev.map((p) => {
            const match = statusData.find((s) => s.id === p.id)
            if (match) {
              return {
                ...p,
                installed: match.installed ?? p.installed,
                enabled: match.enabled ?? p.enabled,
                configured: match.configured ?? p.configured,
              }
            }
            return p
          })
        )
      } else {
        const errorMsg = json.error || json.details || 'Failed to fetch status'
        setError(errorMsg)
        addOutput('nself auth oauth status', errorMsg, false)
      }
    } catch (_err) {
      setError('Failed to connect to OAuth status API')
      addOutput('nself auth oauth status', 'Connection error', false)
    } finally {
      setLoading(false)
    }
  }, [addOutput, parseProviderStatus])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // -- Actions --

  const handleInstall = async (providerId: string) => {
    setActionLoading(`install-${providerId}`)
    setCommandPreview(`nself auth oauth install --provider=${providerId}`)
    try {
      const response = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      })
      const json = await response.json()
      const output = json.data?.output || json.details || json.error || ''
      addOutput(`nself auth oauth install --provider=${providerId}`, output, json.success)

      if (json.success) {
        setProviders((prev) =>
          prev.map((p) => (p.id === providerId ? { ...p, installed: true } : p))
        )
      }
    } catch (_err) {
      addOutput(`nself auth oauth install --provider=${providerId}`, 'Connection error', false)
    } finally {
      setActionLoading(null)
      setCommandPreview('')
    }
  }

  const handleEnable = async (providerId: string) => {
    setActionLoading(`enable-${providerId}`)
    setCommandPreview(`nself auth oauth enable --provider=${providerId}`)
    try {
      const response = await fetch('/api/auth/oauth/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      })
      const json = await response.json()
      const output = json.data?.output || json.details || json.error || ''
      addOutput(`nself auth oauth enable --provider=${providerId}`, output, json.success)

      if (json.success) {
        setProviders((prev) => prev.map((p) => (p.id === providerId ? { ...p, enabled: true } : p)))
      }
    } catch (_err) {
      addOutput(`nself auth oauth enable --provider=${providerId}`, 'Connection error', false)
    } finally {
      setActionLoading(null)
      setCommandPreview('')
    }
  }

  const handleDisable = async (providerId: string) => {
    setActionLoading(`disable-${providerId}`)
    setCommandPreview(`nself auth oauth disable --provider=${providerId}`)
    try {
      const response = await fetch('/api/auth/oauth/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      })
      const json = await response.json()
      const output = json.data?.output || json.details || json.error || ''
      addOutput(`nself auth oauth disable --provider=${providerId}`, output, json.success)

      if (json.success) {
        setProviders((prev) =>
          prev.map((p) => (p.id === providerId ? { ...p, enabled: false } : p))
        )
      }
    } catch (_err) {
      addOutput(`nself auth oauth disable --provider=${providerId}`, 'Connection error', false)
    } finally {
      setActionLoading(null)
      setCommandPreview('')
    }
  }

  const handleTest = async (providerId: string) => {
    setActionLoading(`test-${providerId}`)
    setCommandPreview(`nself auth oauth test --provider=${providerId}`)
    try {
      const response = await fetch('/api/auth/oauth/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      })
      const json = await response.json()
      const output = json.data?.output || json.details || json.error || ''
      addOutput(`nself auth oauth test --provider=${providerId}`, output, json.success)
    } catch (_err) {
      addOutput(`nself auth oauth test --provider=${providerId}`, 'Connection error', false)
    } finally {
      setActionLoading(null)
      setCommandPreview('')
    }
  }

  const openConfigDialog = async (providerId: string) => {
    setConfigProvider(providerId)
    setConfigForm({ clientId: '', clientSecret: '', redirectUri: '' })
    setShowSecret(false)
    setConfigDialogOpen(true)

    // Fetch existing config
    try {
      const response = await fetch(`/api/auth/oauth/config?provider=${providerId}`)
      const json = await response.json()
      if (json.success && json.data?.output) {
        addOutput(`nself auth oauth config --provider=${providerId}`, json.data.output, true)
        // Try to parse existing config from output
        try {
          const parsed = JSON.parse(json.data.output)
          setConfigForm({
            clientId: parsed.clientId || parsed.client_id || '',
            clientSecret: parsed.clientSecret || parsed.client_secret || '',
            redirectUri: parsed.redirectUri || parsed.redirect_uri || '',
          })
        } catch {
          // Output is not JSON; leave form empty for manual entry
        }
      }
    } catch {
      // Ignore fetch errors for pre-loading config
    }
  }

  const handleConfigSave = async () => {
    if (!configProvider) return
    setConfigLoading(true)

    const cmd = `nself auth oauth config --provider=${configProvider} --client-id=*** --client-secret=*** --redirect-uri=${configForm.redirectUri || '(default)'}`
    setCommandPreview(cmd)

    try {
      const response = await fetch('/api/auth/oauth/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: configProvider,
          clientId: configForm.clientId,
          clientSecret: configForm.clientSecret,
          redirectUri: configForm.redirectUri || undefined,
        }),
      })
      const json = await response.json()
      const output = json.data?.output || json.details || json.error || ''
      addOutput(`nself auth oauth config --provider=${configProvider}`, output, json.success)

      if (json.success) {
        setProviders((prev) =>
          prev.map((p) => (p.id === configProvider ? { ...p, configured: true } : p))
        )
        setConfigDialogOpen(false)
      }
    } catch (_err) {
      addOutput(`nself auth oauth config --provider=${configProvider}`, 'Connection error', false)
    } finally {
      setConfigLoading(false)
      setCommandPreview('')
    }
  }

  // -- Render --

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-blue-400 dark:to-white">
                OAuth Providers
              </h1>
              <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
                Manage OAuth authentication providers for your project
              </p>
            </div>
            <Button onClick={fetchStatus} disabled={loading} variant="outline">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {loading ? 'Refreshing...' : 'Refresh Status'}
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error && !loading && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Error</h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Command Preview */}
        {commandPreview && (
          <div className="mb-6">
            <CommandPreview command={commandPreview} />
          </div>
        )}

        {/* Loading State */}
        {loading && providers.every((p) => !p.installed) && (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Loading OAuth provider status...
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Executing nself auth oauth status
              </p>
            </div>
          </div>
        )}

        {/* Provider Cards Grid */}
        {(!loading || providers.some((p) => p.installed)) && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
              >
                {/* Provider Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <ProviderIcon provider={provider.id} />
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {provider.name}
                      </h3>
                      <StatusBadge
                        installed={provider.installed}
                        enabled={provider.enabled}
                        configured={provider.configured}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {!provider.installed ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleInstall(provider.id)}
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === `install-${provider.id}` ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Shield className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Install
                    </Button>
                  ) : (
                    <>
                      {/* Enable / Disable Toggle */}
                      {provider.enabled ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDisable(provider.id)}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === `disable-${provider.id}` ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PowerOff className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Disable
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleEnable(provider.id)}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === `enable-${provider.id}` ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Power className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Enable
                        </Button>
                      )}

                      {/* Configure */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openConfigDialog(provider.id)}
                        disabled={actionLoading !== null}
                      >
                        <Settings className="mr-1.5 h-3.5 w-3.5" />
                        Configure
                      </Button>

                      {/* Test Connection */}
                      {provider.configured && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTest(provider.id)}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === `test-${provider.id}` ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Test
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CLI Output Panel */}
        {cliOutputs.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between pb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                <Terminal className="h-4 w-4" />
                CLI Output
              </h2>
              <button
                onClick={() => setCliOutputs([])}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                Clear
              </button>
            </div>
            <ScrollArea className="h-64 rounded-xl border border-zinc-200 bg-zinc-900 shadow-sm dark:border-zinc-700">
              <div className="p-4">
                {cliOutputs.map((entry, idx) => (
                  <div
                    key={idx}
                    className="mb-3 border-b border-zinc-800 pb-3 last:mb-0 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      {entry.success ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className="font-mono text-green-400">$ {entry.command}</span>
                      <span className="ml-auto text-zinc-500">{entry.timestamp}</span>
                    </div>
                    <pre className="mt-1 font-mono text-xs whitespace-pre-wrap text-zinc-300">
                      {entry.output || '(no output)'}
                    </pre>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Configure {configProvider
                ? PROVIDERS.find((p) => p.id === configProvider)?.name
                : ''}{' '}
              OAuth
            </DialogTitle>
            <DialogDescription>
              Enter the OAuth credentials from your provider&apos;s developer console.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                placeholder="Enter client ID"
                value={configForm.clientId}
                onChange={(e) =>
                  setConfigForm((prev) => ({
                    ...prev,
                    clientId: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="clientSecret"
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Enter client secret"
                  value={configForm.clientSecret}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      clientSecret: e.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="redirectUri">
                Redirect URI <span className="text-zinc-400">(optional)</span>
              </Label>
              <Input
                id="redirectUri"
                placeholder="https://your-domain.com/auth/callback"
                value={configForm.redirectUri}
                onChange={(e) =>
                  setConfigForm((prev) => ({
                    ...prev,
                    redirectUri: e.target.value,
                  }))
                }
              />
            </div>

            {/* Config command preview */}
            <div className="rounded-lg bg-zinc-900 px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Terminal className="h-3 w-3" />
                <span>Command</span>
              </div>
              <pre className="mt-1 font-mono text-xs text-green-400">
                nself auth oauth config --provider={configProvider || '...'} --client-id=
                {configForm.clientId ? '***' : '<client-id>'} --client-secret=
                {configForm.clientSecret ? '***' : '<client-secret>'}
                {configForm.redirectUri ? ` --redirect-uri=${configForm.redirectUri}` : ''}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfigDialogOpen(false)}
              disabled={configLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfigSave}
              disabled={configLoading || !configForm.clientId || !configForm.clientSecret}
            >
              {configLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Settings className="mr-2 h-4 w-4" />
              )}
              {configLoading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function OAuthManagementPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <OAuthManagementContent />
    </Suspense>
  )
}
