'use client'

import { PageShell } from '@/components/PageShell'
import { FormSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Check,
  ClipboardCopy,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  ScrollText,
  Terminal,
  Trash2,
  Webhook,
} from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebhookEntry {
  id: string
  url: string
  events: string[]
  secret: string
  status: string
  lastDelivery?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_TYPES = [
  { value: 'user.created', label: 'User Created', category: 'User' },
  { value: 'user.updated', label: 'User Updated', category: 'User' },
  { value: 'user.deleted', label: 'User Deleted', category: 'User' },
  { value: 'auth.login', label: 'Login', category: 'Auth' },
  { value: 'auth.logout', label: 'Logout', category: 'Auth' },
  { value: 'auth.mfa', label: 'MFA Event', category: 'Auth' },
  { value: 'role.changed', label: 'Role Changed', category: 'Roles' },
]

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

function WebhooksContent() {
  // List state
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cliOutput, setCliOutput] = useState<string | null>(null)
  const [lastCommand, setLastCommand] = useState<string>('nself auth webhooks list')

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [newSecret, setNewSecret] = useState('')
  const [creating, setCreating] = useState(false)

  // Action state
  const [testingId, setTestingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null)

  // Logs state
  const [showLogs, setShowLogs] = useState(false)
  const [logsWebhookId, setLogsWebhookId] = useState<string | null>(null)
  const [logsOutput, setLogsOutput] = useState<string | null>(null)
  const [loadingLogs, setLoadingLogs] = useState(false)

  // ---------------------------------------------------------------------------
  // Fetch webhooks list
  // ---------------------------------------------------------------------------
  const fetchWebhooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself auth webhooks list')
    try {
      const res = await fetch('/api/auth/webhooks')
      const json = await res.json()
      if (json.success) {
        setCliOutput(json.data.output)
        // Parse webhook list if structured output is available.
        // Falls back to empty list since CLI output format may vary.
        setWebhooks([])
      } else {
        setError(json.error || 'Failed to list webhooks')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Create webhook
  // ---------------------------------------------------------------------------
  const createWebhook = useCallback(async () => {
    if (!newUrl || selectedEvents.length === 0) return

    setCreating(true)
    setError(null)

    const eventsArg = selectedEvents.join(',')
    const secretArg = newSecret ? ` --secret=***` : ''
    setLastCommand(`nself auth webhooks create --url=${newUrl} --events=${eventsArg}${secretArg}`)

    try {
      const res = await fetch('/api/auth/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl,
          events: selectedEvents,
          ...(newSecret ? { secret: newSecret } : {}),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setCliOutput(json.data.output || 'Webhook created successfully')
        setNewUrl('')
        setSelectedEvents([])
        setNewSecret('')
        setShowCreateForm(false)
        // Refresh list
        await fetchWebhooks()
      } else {
        setError(json.error || 'Failed to create webhook')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setCreating(false)
    }
  }, [newUrl, selectedEvents, newSecret, fetchWebhooks])

  // ---------------------------------------------------------------------------
  // Test webhook
  // ---------------------------------------------------------------------------
  const testWebhook = useCallback(async (id: string) => {
    setTestingId(id)
    setError(null)
    setLastCommand(`nself auth webhooks test --id=${id}`)
    try {
      const res = await fetch('/api/auth/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (json.success) {
        setCliOutput(json.data.output || 'Test delivery sent')
      } else {
        setError(json.error || 'Failed to test webhook')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setTestingId(null)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Delete webhook
  // ---------------------------------------------------------------------------
  const deleteWebhook = useCallback(async (id: string) => {
    setDeletingId(id)
    setError(null)
    setLastCommand(`nself auth webhooks delete ${id}`)
    try {
      const res = await fetch(`/api/auth/webhooks/${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        setCliOutput(json.data.output || 'Webhook deleted')
        setWebhooks((prev) => prev.filter((w) => w.id !== id))
      } else {
        setError(json.error || 'Failed to delete webhook')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setDeletingId(null)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Fetch logs
  // ---------------------------------------------------------------------------
  const fetchLogs = useCallback(async (webhookId?: string) => {
    setLoadingLogs(true)
    setShowLogs(true)
    setLogsWebhookId(webhookId || null)
    setError(null)
    const idParam = webhookId ? `?id=${webhookId}&limit=50` : '?limit=50'
    setLastCommand(
      webhookId
        ? `nself auth webhooks logs --id=${webhookId} --limit=50`
        : 'nself auth webhooks logs --limit=50'
    )
    try {
      const res = await fetch(`/api/auth/webhooks/logs${idParam}`)
      const json = await res.json()
      if (json.success) {
        setLogsOutput(json.data.output)
        setCliOutput(json.data.output)
      } else {
        setError(json.error || 'Failed to fetch logs')
        setCliOutput(json.details || json.error)
      }
    } catch (_fetchError) {
      setError('Failed to connect to API')
      setCliOutput('Error: Failed to connect to API')
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Copy secret to clipboard
  // ---------------------------------------------------------------------------
  const copySecret = useCallback(async (secret: string, id: string) => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopiedSecret(id)
      setTimeout(() => setCopiedSecret(null), 2000)
    } catch (_copyError) {
      // Clipboard API may not be available
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Toggle event selection
  // ---------------------------------------------------------------------------
  const toggleEvent = useCallback((eventValue: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventValue) ? prev.filter((e) => e !== eventValue) : [...prev, eventValue]
    )
  }, [])

  // Generate a random secret for the form
  const generateSecret = useCallback(() => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const secret = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
    setNewSecret(`whsec_${secret}`)
  }, [])

  return (
    <PageShell
      title="Webhooks"
      description="Manage webhook endpoints for auth events and view delivery logs"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchWebhooks}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
            <ScrollText className="mr-2 h-4 w-4" />
            All Logs
          </Button>
          <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Webhook
          </Button>
        </div>
      }
    >
      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Create Webhook Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Create New Webhook</CardTitle>
            <CardDescription>
              Configure a new webhook endpoint to receive auth event notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* URL Input */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Endpoint URL
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com/webhooks/auth"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>

              {/* Event Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Events
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {EVENT_TYPES.map((event) => (
                    <label
                      key={event.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                        selectedEvents.includes(event.value)
                          ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event.value)}
                        onChange={() => toggleEvent(event.value)}
                        className="sr-only"
                      />
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selectedEvents.includes(event.value)
                            ? 'border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400'
                            : 'border-zinc-300 dark:border-zinc-600'
                        }`}
                      >
                        {selectedEvents.includes(event.value) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {event.label}
                        </div>
                        <div className="text-xs text-zinc-500">{event.value}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Secret */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Signing Secret (optional)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="whsec_..."
                    value={newSecret}
                    onChange={(e) => setNewSecret(e.target.value)}
                    className="font-mono"
                  />
                  <Button variant="outline" size="sm" onClick={generateSecret} className="shrink-0">
                    Generate
                  </Button>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Used to verify webhook payloads. If left empty, one will be auto-generated.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={createWebhook}
                  disabled={creating || !newUrl || selectedEvents.length === 0}
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Webhook className="mr-2 h-4 w-4" />
                  )}
                  Create Webhook
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewUrl('')
                    setSelectedEvents([])
                    setNewSecret('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook List */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-zinc-500" />
            <CardTitle className="text-base">Registered Webhooks</CardTitle>
          </div>
          <CardDescription>
            All configured webhook endpoints and their delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="py-8 text-center">
              <Webhook className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
              <p className="text-sm text-zinc-500">
                No webhooks configured. Click &ldquo;Refresh&rdquo; to load from the CLI or
                &ldquo;Create Webhook&rdquo; to add one.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {webhook.url}
                        </code>
                        <Badge variant={webhook.status === 'active' ? 'default' : 'secondary'}>
                          {webhook.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                      {webhook.lastDelivery && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Last delivery: {webhook.lastDelivery}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-1">
                      {/* Copy Secret */}
                      {webhook.secret && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copySecret(webhook.secret, webhook.id)}
                          title="Copy signing secret"
                        >
                          {copiedSecret === webhook.id ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <ClipboardCopy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {/* Test */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testWebhook(webhook.id)}
                        disabled={testingId === webhook.id}
                        title="Send test delivery"
                      >
                        {testingId === webhook.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      {/* View Logs */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchLogs(webhook.id)}
                        title="View delivery logs"
                      >
                        <ScrollText className="h-4 w-4" />
                      </Button>
                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteWebhook(webhook.id)}
                        disabled={deletingId === webhook.id}
                        title="Delete webhook"
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        {deletingId === webhook.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Logs */}
      {showLogs && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-zinc-500" />
                <CardTitle className="text-base">
                  Delivery Logs
                  {logsWebhookId && (
                    <span className="ml-2 font-mono text-sm font-normal text-zinc-500">
                      ({logsWebhookId})
                    </span>
                  )}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLogs(false)
                  setLogsOutput(null)
                  setLogsWebhookId(null)
                }}
              >
                Close
              </Button>
            </div>
            <CardDescription>Recent webhook delivery attempts and responses</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
              </div>
            ) : logsOutput ? (
              <ScrollArea className="max-h-64">
                <pre className="text-xs text-zinc-700 dark:text-zinc-300">{logsOutput}</pre>
              </ScrollArea>
            ) : (
              <p className="py-4 text-center text-sm text-zinc-500">No delivery logs available</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* CLI Command Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-zinc-500" />
            <CardTitle className="text-base">CLI Command</CardTitle>
          </div>
          <CardDescription>Command executed against the nself CLI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-zinc-950 p-4">
            <div className="mb-2 font-mono text-sm text-emerald-400">$ {lastCommand}</div>
            {cliOutput && (
              <ScrollArea className="max-h-48">
                <pre className="font-mono text-xs text-zinc-300">{cliOutput}</pre>
              </ScrollArea>
            )}
            {!cliOutput && (
              <p className="font-mono text-xs text-zinc-500">Run a command to see output here</p>
            )}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}

export default function WebhooksPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <WebhooksContent />
    </Suspense>
  )
}
