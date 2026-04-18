'use client'

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Plus,
  Server,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type {
  RemoteConnection,
  RemoteMode,
  TestConnectionResult,
} from './types'

// ---------------------------------------------------------------------------
// Add-connection form
// ---------------------------------------------------------------------------

interface AddConnectionFormProps {
  onAdd: (conn: Omit<RemoteConnection, 'id'>) => Promise<void>
  onCancel: () => void
  loading: boolean
}

function AddConnectionForm({
  onAdd,
  onCancel,
  loading,
}: AddConnectionFormProps) {
  const [name, setName] = useState('')
  const [mode, setMode] = useState<RemoteMode>('ssh')
  const [host, setHost] = useState('')
  const [port, setPort] = useState(22)
  const [sshUser, setSshUser] = useState('')
  const [sshKeyPath, setSshKeyPath] = useState('')
  const [apiEndpoint, setApiEndpoint] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const trimmedName = name.trim()
    const trimmedHost = host.trim()

    if (trimmedName.length === 0) {
      setFormError('Connection name is required.')
      return
    }
    if (trimmedHost.length === 0) {
      setFormError('Host is required.')
      return
    }
    if (mode === 'ssh') {
      if (sshUser.trim().length === 0) {
        setFormError('SSH user is required.')
        return
      }
      if (port < 1 || port > 65535) {
        setFormError('Port must be between 1 and 65535.')
        return
      }
    }
    if (mode === 'api' && apiEndpoint.trim().length === 0) {
      setFormError('API endpoint is required.')
      return
    }

    try {
      await onAdd({
        name: trimmedName,
        host: trimmedHost,
        port,
        sshUser: sshUser.trim(),
        sshKeyPath: sshKeyPath.trim(),
        apiEndpoint: apiEndpoint.trim(),
        mode,
        active: false,
      })
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to add connection.',
      )
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="border-nself-border bg-nself-bg/60 mt-4 space-y-3 rounded-lg border p-4"
    >
      <p className="text-nself-text-muted text-xs font-semibold tracking-widest uppercase">
        New Connection
      </p>

      {/* Name */}
      <div>
        <label
          htmlFor="rc-name"
          className="text-nself-text-muted mb-1 block text-xs font-medium"
        >
          Display name
        </label>
        <input
          id="rc-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="prod-hetzner"
          className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary w-full rounded-lg border px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Mode selector */}
      <div>
        <label
          htmlFor="rc-mode"
          className="text-nself-text-muted mb-1 block text-xs font-medium"
        >
          Mode
        </label>
        <div className="relative">
          <select
            id="rc-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as RemoteMode)}
            className="border-nself-border bg-nself-bg text-nself-text focus:border-nself-primary focus:ring-nself-primary w-full appearance-none rounded-lg border px-3 py-1.5 text-sm focus:ring-1 focus:outline-none"
          >
            <option value="ssh">SSH</option>
            <option value="api">API</option>
          </select>
          <ChevronDown className="text-nself-text-muted pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2" />
        </div>
      </div>

      {/* Host */}
      <div>
        <label
          htmlFor="rc-host"
          className="text-nself-text-muted mb-1 block text-xs font-medium"
        >
          Host
        </label>
        <input
          id="rc-host"
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="192.168.1.10"
          className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary w-full rounded-lg border px-3 py-1.5 font-mono text-sm focus:ring-1 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* SSH-specific fields */}
      {mode === 'ssh' && (
        <>
          <div>
            <label
              htmlFor="rc-port"
              className="text-nself-text-muted mb-1 block text-xs font-medium"
            >
              SSH port
            </label>
            <input
              id="rc-port"
              type="number"
              min={1}
              max={65535}
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary w-full rounded-lg border px-3 py-1.5 font-mono text-sm focus:ring-1 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="rc-user"
              className="text-nself-text-muted mb-1 block text-xs font-medium"
            >
              SSH user
            </label>
            <input
              id="rc-user"
              type="text"
              value={sshUser}
              onChange={(e) => setSshUser(e.target.value)}
              placeholder="root"
              className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary w-full rounded-lg border px-3 py-1.5 font-mono text-sm focus:ring-1 focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div>
            <label
              htmlFor="rc-key"
              className="text-nself-text-muted mb-1 block text-xs font-medium"
            >
              SSH key path (optional)
            </label>
            <input
              id="rc-key"
              type="text"
              value={sshKeyPath}
              onChange={(e) => setSshKeyPath(e.target.value)}
              placeholder="/home/user/.ssh/id_ed25519"
              className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary w-full rounded-lg border px-3 py-1.5 font-mono text-sm focus:ring-1 focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </>
      )}

      {/* API-specific fields */}
      {mode === 'api' && (
        <div>
          <label
            htmlFor="rc-api"
            className="text-nself-text-muted mb-1 block text-xs font-medium"
          >
            API endpoint
          </label>
          <input
            id="rc-api"
            type="url"
            value={apiEndpoint}
            onChange={(e) => setApiEndpoint(e.target.value)}
            placeholder="https://cloud.example.com"
            className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary w-full rounded-lg border px-3 py-1.5 font-mono text-sm focus:ring-1 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}

      {/* Form error */}
      {formError !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{formError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-nself-primary hover:bg-nself-primary-dark flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Save
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Connection row
// ---------------------------------------------------------------------------

interface ConnectionRowProps {
  conn: RemoteConnection
  testResult: TestConnectionResult | null
  testing: boolean
  onActivate: (id: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onTest: (conn: RemoteConnection) => Promise<void>
  actionLoading: boolean
}

function ConnectionRow({
  conn,
  testResult,
  testing,
  onActivate,
  onRemove,
  onTest,
  actionLoading,
}: ConnectionRowProps) {
  const modeLabel =
    conn.mode === 'ssh'
      ? `SSH ${conn.sshUser}@${conn.host}:${conn.port}`
      : conn.apiEndpoint

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        conn.active
          ? 'border-nself-primary/50 bg-nself-primary/10'
          : 'border-nself-border bg-nself-bg/40'
      }`}
    >
      {/* Top row: name + mode badge + active indicator */}
      <div className="flex items-center gap-2">
        <Server className="text-nself-primary h-4 w-4 flex-shrink-0" />
        <span
          className="text-nself-text flex-1 truncate text-sm font-semibold"
          title={conn.name}
        >
          {conn.name}
        </span>
        {conn.active && (
          <span className="border-nself-primary/40 bg-nself-primary/20 text-nself-primary flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </span>
        )}
        <span className="border-nself-border text-nself-text-muted rounded border px-1.5 py-0.5 font-mono text-xs uppercase">
          {conn.mode}
        </span>
      </div>

      {/* Host line */}
      <p
        className="text-nself-text-muted mt-1 truncate pl-6 font-mono text-xs"
        title={modeLabel}
      >
        {modeLabel}
      </p>

      {/* Test result */}
      {testResult !== null && (
        <div
          className={`mt-2 flex items-start gap-2 rounded border px-2 py-1.5 ${
            testResult.success
              ? 'border-green-500/30 bg-green-500/10 text-green-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {testResult.success ? (
            <Wifi className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <WifiOff className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          )}
          <span className="text-xs">
            {testResult.message}
            {testResult.success && (
              <span className="ml-1 opacity-70">
                ({testResult.latencyMs} ms)
              </span>
            )}
          </span>
        </div>
      )}

      {/* Actions row */}
      <div className="mt-2 flex gap-2 pl-6">
        {!conn.active && (
          <button
            type="button"
            onClick={() => onActivate(conn.id)}
            disabled={actionLoading}
            className="border-nself-primary/40 text-nself-primary hover:bg-nself-primary/20 rounded-lg border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Activate
          </button>
        )}

        <button
          type="button"
          onClick={() => onTest(conn)}
          disabled={actionLoading || testing}
          className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Wifi className="h-3 w-3" />
          )}
          Test
        </button>

        <button
          type="button"
          onClick={() => onRemove(conn.id)}
          disabled={actionLoading}
          className="ml-auto flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RemotePanel() {
  const [connections, setConnections] = useState<RemoteConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<
    Record<string, TestConnectionResult>
  >({})

  // ---------------------------------------------------------------------------
  // Load connections on mount
  // ---------------------------------------------------------------------------

  const loadConnections = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/remote/connections')
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }
      const data = (await res.json()) as { connections: RemoteConnection[] }
      setConnections(data.connections)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load connections.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  // ---------------------------------------------------------------------------
  // Add connection
  // ---------------------------------------------------------------------------

  async function handleAdd(conn: Omit<RemoteConnection, 'id'>) {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/remote/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conn),
      })
      const data = (await res.json()) as {
        connection?: RemoteConnection
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to add connection.')
      }
      if (data.connection !== undefined) {
        setConnections((prev) => [...prev, data.connection!])
        setShowAddForm(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add connection.')
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Remove connection
  // ---------------------------------------------------------------------------

  async function handleRemove(id: string) {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/remote/connections/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        },
      )
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Failed to delete connection.')
      }
      setConnections((prev) => prev.filter((c) => c.id !== id))
      setTestResults((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete connection.',
      )
    } finally {
      setActionLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Activate connection
  // ---------------------------------------------------------------------------

  async function handleActivate(id: string) {
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/remote/connections/${encodeURIComponent(id)}/activate`,
        {
          method: 'POST',
        },
      )
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Failed to activate connection.')
      }
      setConnections((prev) => prev.map((c) => ({ ...c, active: c.id === id })))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to activate connection.',
      )
    } finally {
      setActionLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Test connection
  // ---------------------------------------------------------------------------

  async function handleTest(conn: RemoteConnection) {
    setTestingId(conn.id)
    setError(null)
    try {
      const res = await fetch(
        `/api/remote/connections/${encodeURIComponent(conn.id)}/test`,
        {
          method: 'POST',
        },
      )
      const data = (await res.json()) as
        | TestConnectionResult
        | { error?: string }
      if (!res.ok) {
        const errData = data as { error?: string }
        throw new Error(errData.error ?? 'Test request failed.')
      }
      setTestResults((prev) => ({
        ...prev,
        [conn.id]: data as TestConnectionResult,
      }))
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [conn.id]: {
          success: false,
          latencyMs: -1,
          message: err instanceof Error ? err.message : 'Test failed.',
        },
      }))
    } finally {
      setTestingId(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const activeConn = connections.find((c) => c.active) ?? null

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="glass-card p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="text-nself-primary h-5 w-5" />
          <h2 className="text-nself-text text-sm font-semibold">Remote Mode</h2>
        </div>
        {loading && (
          <Loader2 className="text-nself-primary h-4 w-4 animate-spin" />
        )}
      </div>

      {/* Status bar */}
      <div
        className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 ${
          activeConn !== null
            ? 'border-nself-primary/30 bg-nself-primary/10'
            : 'border-nself-border bg-nself-bg/40'
        }`}
      >
        {activeConn !== null ? (
          <>
            <Wifi className="text-nself-primary h-4 w-4 flex-shrink-0" />
            <span className="text-nself-text text-xs">
              Connected to{' '}
              <span className="nself-gradient-text font-semibold">
                {activeConn.name}
              </span>
            </span>
            <span className="border-nself-primary/40 bg-nself-primary/20 text-nself-primary ml-auto rounded-full border px-2 py-0.5 text-xs font-medium">
              Remote
            </span>
          </>
        ) : (
          <>
            <WifiOff className="text-nself-text-muted h-4 w-4 flex-shrink-0" />
            <span className="text-nself-text-muted text-xs">
              Local mode — no remote connection active
            </span>
          </>
        )}
      </div>

      {/* License note */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
        <p className="text-xs text-amber-300">
          Remote mode requires an active Pro license. Set your key with{' '}
          <code className="font-mono">nself license set &lt;key&gt;</code>.
        </p>
      </div>

      {/* Connection list */}
      {!loading && connections.length > 0 && (
        <div className="mb-4 space-y-2">
          {connections.map((conn) => (
            <ConnectionRow
              key={conn.id}
              conn={conn}
              testResult={testResults[conn.id] ?? null}
              testing={testingId === conn.id}
              onActivate={handleActivate}
              onRemove={handleRemove}
              onTest={handleTest}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && connections.length === 0 && !showAddForm && (
        <p className="text-nself-text-muted mb-4 text-xs">
          No remote connections saved. Add one below to connect to a remote
          nCloud server.
        </p>
      )}

      {/* Global error */}
      {error !== null && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Add connection toggle / form */}
      {showAddForm ? (
        <AddConnectionForm
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
          loading={actionLoading}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          disabled={loading}
          className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-primary flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Connection
        </button>
      )}
    </div>
  )
}
