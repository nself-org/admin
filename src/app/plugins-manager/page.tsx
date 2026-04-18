'use client'

import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Package,
  Puzzle,
  RefreshCw,
  Settings,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface NselfPlugin {
  name: string
  version: string
  tier:
    | 'free'
    | 'basic'
    | 'pro'
    | 'elite'
    | 'business'
    | 'business-plus'
    | 'enterprise'
  installed: boolean
  enabled: boolean
  bundle: string | null
  description: string
  requiresLicense: boolean
  hasUpdate: boolean
  availableVersion: string | null
  status: 'active' | 'dormant' | 'revoked' | 'error'
  statusDetail?: string
}

interface PluginsResponse {
  plugins: NselfPlugin[]
  licenseTier: NselfPlugin['tier']
  licenseValid: boolean
}

function TierBadge({ tier }: { tier: NselfPlugin['tier'] }) {
  const tone =
    tier === 'free'
      ? 'border-green-500/40 text-green-400 bg-green-500/10'
      : tier === 'basic'
        ? 'border-sky-500/40 text-sky-400 bg-sky-500/10'
        : tier === 'pro'
          ? 'border-violet-500/40 text-violet-400 bg-violet-500/10'
          : tier === 'elite'
            ? 'border-fuchsia-500/40 text-fuchsia-400 bg-fuchsia-500/10'
            : 'border-amber-500/40 text-amber-400 bg-amber-500/10'
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${tone}`}
    >
      {tier.replace('-', ' ')}
    </span>
  )
}

function StatusChip({ plugin }: { plugin: NselfPlugin }) {
  if (!plugin.installed) {
    return (
      <span className="border-nself-border bg-nself-bg/40 text-nself-text-muted rounded-full border px-2 py-0.5 text-xs font-medium">
        Not installed
      </span>
    )
  }
  if (plugin.status === 'revoked') {
    return (
      <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
        Revoked
      </span>
    )
  }
  if (plugin.status === 'dormant') {
    return (
      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
        Dormant
      </span>
    )
  }
  if (plugin.status === 'error') {
    return (
      <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
        Error
      </span>
    )
  }
  return (
    <span className="rounded-full border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
      Active
    </span>
  )
}

interface ConfigDrawerProps {
  plugin: NselfPlugin
  onClose: () => void
  onSave: (config: Record<string, string>) => Promise<void>
}

function ConfigDrawer({ plugin, onClose, onSave }: ConfigDrawerProps) {
  const [env, setEnv] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/nself-plugins/${encodeURIComponent(plugin.name)}/config`,
        )
        if (!res.ok) throw new Error(`Server ${res.status}`)
        const data = (await res.json()) as { env: Record<string, string> }
        setEnv(data.env)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load config.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [plugin.name])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave(env)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="glass-card h-full w-full max-w-md overflow-y-auto p-6">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="text-nself-primary h-4 w-4" />
          <h2 className="text-nself-text text-base font-semibold">
            Configure {plugin.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-nself-text-muted hover:text-nself-text ml-auto rounded-lg p-1 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-nself-primary h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            {Object.keys(env).length === 0 ? (
              <p className="text-nself-text-muted text-sm">
                No configuration keys.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(env).map(([key, value]) => (
                  <div key={key}>
                    <label
                      htmlFor={`cfg-${key}`}
                      className="text-nself-text-muted mb-1 block text-xs font-medium"
                    >
                      {key}
                    </label>
                    <input
                      id={`cfg-${key}`}
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setEnv((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="border-nself-border bg-nself-bg text-nself-text focus:border-nself-primary focus:ring-nself-primary w-full rounded-lg border px-3 py-1.5 font-mono text-xs focus:ring-1 focus:outline-none"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                ))}
              </div>
            )}

            {error !== null && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-nself-primary hover:bg-nself-primary-dark flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PluginRow({
  plugin,
  onInstall,
  onUninstall,
  onUpdate,
  onRevoke,
  onConfigure,
  busy,
}: {
  plugin: NselfPlugin
  onInstall: (p: NselfPlugin) => Promise<void>
  onUninstall: (p: NselfPlugin) => Promise<void>
  onUpdate: (p: NselfPlugin) => Promise<void>
  onRevoke: (p: NselfPlugin) => Promise<void>
  onConfigure: (p: NselfPlugin) => void
  busy: boolean
}) {
  return (
    <li className="border-nself-border rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Puzzle className="text-nself-primary h-4 w-4" />
        <span className="text-nself-text flex-1 truncate text-sm font-semibold">
          {plugin.name}
        </span>
        <span className="text-nself-text-muted font-mono text-xs">
          v{plugin.version}
        </span>
        <TierBadge tier={plugin.tier} />
        <StatusChip plugin={plugin} />
      </div>
      <p className="text-nself-text-muted mt-1 pl-6 text-xs">
        {plugin.description}
      </p>
      {plugin.statusDetail !== undefined && (
        <p className="mt-1 pl-6 text-xs text-amber-300">
          {plugin.statusDetail}
        </p>
      )}
      {plugin.bundle !== null && (
        <p className="text-nself-text-muted mt-1 pl-6 text-xs">
          Bundle: <span className="font-mono">{plugin.bundle}</span>
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2 pl-6">
        {!plugin.installed ? (
          <button
            type="button"
            onClick={() => onInstall(plugin)}
            disabled={busy}
            className="border-nself-primary/40 text-nself-primary hover:bg-nself-primary/10 flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3 w-3" />
            Install
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onConfigure(plugin)}
              disabled={busy}
              className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Settings className="h-3 w-3" />
              Configure
            </button>
            {plugin.hasUpdate && (
              <button
                type="button"
                onClick={() => onUpdate(plugin)}
                disabled={busy}
                className="flex items-center gap-1 rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" />
                Update to v{plugin.availableVersion}
              </button>
            )}
            <button
              type="button"
              onClick={() => onUninstall(plugin)}
              disabled={busy}
              className="flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Uninstall
            </button>
            {plugin.requiresLicense && plugin.status !== 'revoked' && (
              <button
                type="button"
                onClick={() => onRevoke(plugin)}
                disabled={busy}
                className="border-nself-border text-nself-text-muted flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-medium transition-colors hover:border-red-400 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Revoke
              </button>
            )}
          </>
        )}
      </div>
    </li>
  )
}

export default function PluginsManagerPage() {
  const [data, setData] = useState<PluginsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyName, setBusyName] = useState<string | null>(null)
  const [configTarget, setConfigTarget] = useState<NselfPlugin | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/nself-plugins', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Server ${res.status}`)
      const json = (await res.json()) as PluginsResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plugins.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function runAction(
    plugin: NselfPlugin,
    action: 'install' | 'uninstall' | 'update' | 'revoke',
  ) {
    setBusyName(plugin.name)
    setError(null)
    try {
      const res = await fetch(
        `/api/nself-plugins/${encodeURIComponent(plugin.name)}/${action}`,
        { method: 'POST' },
      )
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Server ${res.status}`)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}.`)
    } finally {
      setBusyName(null)
    }
  }

  async function handleSaveConfig(config: Record<string, string>) {
    if (configTarget === null) return
    const res = await fetch(
      `/api/nself-plugins/${encodeURIComponent(configTarget.name)}/config`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: config }),
      },
    )
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `Server ${res.status}`)
    }
    await load()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">
            Plugin Management
          </h1>
          <p className="text-nself-text-muted text-xs">
            Install, configure, update, and revoke nSelf plugins
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {data !== null && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="bg-nself-primary/15 flex h-9 w-9 items-center justify-center rounded-lg">
              <Package className="text-nself-primary h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-nself-text-muted text-xs">License tier</p>
              <div className="flex items-center gap-2">
                <TierBadge tier={data.licenseTier} />
                {data.licenseValid ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    valid
                  </span>
                ) : (
                  <span className="text-xs text-red-400">inactive</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      <div className="glass-card p-4">
        <h2 className="text-nself-text mb-3 text-sm font-semibold">
          Available Plugins
        </h2>
        {loading && data === null ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-nself-primary h-5 w-5 animate-spin" />
          </div>
        ) : data === null || data.plugins.length === 0 ? (
          <p className="text-nself-text-muted text-xs">No plugins available.</p>
        ) : (
          <ul className="space-y-2">
            {data.plugins.map((p) => (
              <PluginRow
                key={p.name}
                plugin={p}
                onInstall={(p) => runAction(p, 'install')}
                onUninstall={(p) => runAction(p, 'uninstall')}
                onUpdate={(p) => runAction(p, 'update')}
                onRevoke={(p) => runAction(p, 'revoke')}
                onConfigure={setConfigTarget}
                busy={busyName === p.name}
              />
            ))}
          </ul>
        )}
      </div>

      {configTarget !== null && (
        <ConfigDrawer
          plugin={configTarget}
          onClose={() => setConfigTarget(null)}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  )
}
