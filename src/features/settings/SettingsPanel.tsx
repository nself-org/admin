'use client'

import {
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Keyboard,
  Loader2,
  Monitor,
  Moon,
  Plus,
  Settings,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AdminSettings,
  CredentialEntry,
  PluginKeyEntry,
  Theme,
} from './types'

// ---------------------------------------------------------------------------
// Utility: masked value display with reveal toggle
// ---------------------------------------------------------------------------

interface MaskedValueProps {
  value: string
}

function MaskedValue({ value }: MaskedValueProps) {
  const [revealed, setRevealed] = useState(false)

  return (
    <span className="flex items-center gap-1.5">
      <span className="text-nself-text-muted font-mono text-xs">
        {revealed ? value : '●●●●●●●●'}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="text-nself-text-muted hover:text-nself-text transition-colors"
        aria-label={revealed ? 'Hide value' : 'Reveal value'}
      >
        {revealed ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </button>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Utility: tab button
// ---------------------------------------------------------------------------

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-nself-primary/20 text-nself-primary'
          : 'text-nself-text-muted hover:bg-nself-primary/10 hover:text-nself-text'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Utility: inline success toast
// ---------------------------------------------------------------------------

interface SaveStatusProps {
  saved: boolean
  error: string | null
}

function SaveStatus({ saved, error }: SaveStatusProps) {
  if (error) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-400">
        <X className="h-3.5 w-3.5" />
        {error}
      </span>
    )
  }
  if (saved) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Saved
      </span>
    )
  }
  return null
}

// ---------------------------------------------------------------------------
// Tab: Credentials
// ---------------------------------------------------------------------------

interface CredentialsTabProps {
  credentials: CredentialEntry[]
  onUpdate: (key: string, value: string, description?: string) => Promise<void>
  onRemove: (key: string) => Promise<void>
}

function CredentialsTab({
  credentials,
  onUpdate,
  onRemove,
}: CredentialsTabProps) {
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [removingKey, setRemovingKey] = useState<string | null>(null)

  async function handleAdd() {
    if (!newKey || !newValue) return
    setAdding(true)
    setAddError(null)
    try {
      await onUpdate(newKey, newValue, newDesc || undefined)
      setNewKey('')
      setNewValue('')
      setNewDesc('')
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : 'Failed to save credential',
      )
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(key: string) {
    setRemovingKey(key)
    try {
      await onRemove(key)
    } finally {
      setRemovingKey(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-nself-text-muted text-sm">
        Store sensitive environment variable values for this project. Values are
        persisted locally in{' '}
        <code className="bg-nself-bg rounded px-1 font-mono text-xs">
          .nself/admin-settings.json
        </code>
        .
      </p>

      {credentials.length > 0 && (
        <div className="space-y-2">
          {credentials.map((cred) => (
            <div
              key={cred.key}
              className="glass-card-elevated flex items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-nself-text truncate font-mono text-sm font-semibold">
                  {cred.key}
                </p>
                {cred.description && (
                  <p className="text-nself-text-muted mt-0.5 truncate text-xs">
                    {cred.description}
                  </p>
                )}
              </div>
              <MaskedValue value={cred.value} />
              <button
                type="button"
                onClick={() => handleRemove(cred.key)}
                disabled={removingKey === cred.key}
                className="text-nself-text-muted ml-2 transition-colors hover:text-red-400 disabled:opacity-40"
                aria-label={`Remove credential ${cred.key}`}
              >
                {removingKey === cred.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="glass-card space-y-3 p-4">
        <p className="text-nself-text-muted text-xs font-semibold tracking-widest uppercase">
          Add Credential
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={newKey}
            onChange={(e) =>
              setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))
            }
            placeholder="KEY_NAME"
            className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary rounded-lg border px-3 py-2 font-mono text-sm focus:ring-1 focus:outline-none"
            aria-label="Credential key name"
            autoComplete="off"
            spellCheck={false}
          />
          <input
            type="password"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="value"
            className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary rounded-lg border px-3 py-2 font-mono text-sm focus:ring-1 focus:outline-none"
            aria-label="Credential value"
            autoComplete="new-password"
          />
        </div>
        <input
          type="text"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Description (optional)"
          className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
          aria-label="Credential description"
        />
        {addError && <p className="text-xs text-red-400">{addError}</p>}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newKey || !newValue || adding}
          className="nself-btn-primary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Credential
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Plugin Keys
// ---------------------------------------------------------------------------

interface PluginKeysTabProps {
  pluginKeys: PluginKeyEntry[]
  onUpdate: (pluginName: string, envVar: string, value: string) => Promise<void>
}

function PluginKeysTab({ pluginKeys, onUpdate }: PluginKeysTabProps) {
  const [newPlugin, setNewPlugin] = useState('')
  const [newEnvVar, setNewEnvVar] = useState('')
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  async function handleAdd() {
    if (!newPlugin || !newEnvVar || !newValue) return
    setAdding(true)
    setAddError(null)
    try {
      await onUpdate(newPlugin, newEnvVar, newValue)
      setNewPlugin('')
      setNewEnvVar('')
      setNewValue('')
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : 'Failed to save plugin key',
      )
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-nself-text-muted text-sm">
        Store API keys required by installed plugins (e.g.{' '}
        <code className="bg-nself-bg rounded px-1 font-mono text-xs">
          OPENAI_API_KEY
        </code>{' '}
        for the <strong className="text-nself-text">ai</strong> plugin).
      </p>

      {pluginKeys.length > 0 && (
        <div className="space-y-2">
          {pluginKeys.map((pk) => (
            <div
              key={`${pk.pluginName}:${pk.envVar}`}
              className="glass-card-elevated flex items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-nself-text truncate text-sm font-semibold">
                  {pk.pluginName}
                  <span className="text-nself-text-muted mx-2">·</span>
                  <span className="font-mono text-xs">{pk.envVar}</span>
                </p>
              </div>
              <MaskedValue value={pk.value} />
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="glass-card space-y-3 p-4">
        <p className="text-nself-text-muted text-xs font-semibold tracking-widest uppercase">
          Add Plugin Key
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={newPlugin}
            onChange={(e) =>
              setNewPlugin(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
              )
            }
            placeholder="plugin-name"
            className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary rounded-lg border px-3 py-2 font-mono text-sm focus:ring-1 focus:outline-none"
            aria-label="Plugin name"
            autoComplete="off"
            spellCheck={false}
          />
          <input
            type="text"
            value={newEnvVar}
            onChange={(e) =>
              setNewEnvVar(
                e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
              )
            }
            placeholder="ENV_VAR_NAME"
            className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary rounded-lg border px-3 py-2 font-mono text-sm focus:ring-1 focus:outline-none"
            aria-label="Environment variable name"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <input
          type="password"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="key value"
          className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary w-full rounded-lg border px-3 py-2 font-mono text-sm focus:ring-1 focus:outline-none"
          aria-label="Plugin key value"
          autoComplete="new-password"
        />
        {addError && <p className="text-xs text-red-400">{addError}</p>}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newPlugin || !newEnvVar || !newValue || adding}
          className="nself-btn-primary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Plugin Key
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: Env Vars
// ---------------------------------------------------------------------------

interface EnvVarsTabProps {
  envVars: Record<string, string>
  onChange: (envVars: Record<string, string>) => void
  onSave: () => Promise<void>
  saving: boolean
  saveStatus: { saved: boolean; error: string | null }
}

function EnvVarsTab({
  envVars,
  onChange,
  onSave,
  saving,
  saveStatus,
}: EnvVarsTabProps) {
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  function handleAdd() {
    if (!newKey || !newValue) return
    onChange({ ...envVars, [newKey]: newValue })
    setNewKey('')
    setNewValue('')
  }

  function handleRemove(key: string) {
    const next = { ...envVars }
    delete next[key]
    onChange(next)
  }

  function handleEditValue(key: string, value: string) {
    onChange({ ...envVars, [key]: value })
  }

  const entries = Object.entries(envVars)

  return (
    <div className="space-y-4">
      <p className="text-nself-text-muted text-sm">
        Project-level environment variable overrides. These supplement values in
        your{' '}
        <code className="bg-nself-bg rounded px-1 font-mono text-xs">.env</code>{' '}
        files.
      </p>

      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(([key, val]) => (
            <div
              key={key}
              className="glass-card-elevated flex items-center gap-2 px-3 py-2"
            >
              <span className="text-nself-text w-48 flex-shrink-0 truncate font-mono text-xs font-semibold">
                {key}
              </span>
              <input
                type="text"
                value={val}
                onChange={(e) => handleEditValue(key, e.target.value)}
                className="border-nself-border bg-nself-bg text-nself-text focus:border-nself-primary min-w-0 flex-1 rounded border px-2 py-1 font-mono text-xs focus:outline-none"
                aria-label={`Value for ${key}`}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => handleRemove(key)}
                className="text-nself-text-muted flex-shrink-0 transition-colors hover:text-red-400"
                aria-label={`Remove ${key}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="glass-card space-y-2 p-4">
        <p className="text-nself-text-muted text-xs font-semibold tracking-widest uppercase">
          Add Variable
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKey}
            onChange={(e) =>
              setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))
            }
            placeholder="KEY_NAME"
            className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary w-48 flex-shrink-0 rounded-lg border px-3 py-2 font-mono text-sm focus:ring-1 focus:outline-none"
            aria-label="Environment variable key"
            autoComplete="off"
            spellCheck={false}
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="value"
            className="border-nself-border bg-nself-bg text-nself-text placeholder:text-nself-text-muted focus:border-nself-primary focus:ring-nself-primary min-w-0 flex-1 rounded-lg border px-3 py-2 font-mono text-sm focus:ring-1 focus:outline-none"
            aria-label="Environment variable value"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newKey || !newValue}
            className="nself-btn-primary flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="nself-btn-primary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Env Vars
        </button>
        <SaveStatus saved={saveStatus.saved} error={saveStatus.error} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab: General
// ---------------------------------------------------------------------------

interface GeneralTabProps {
  telemetryEnabled: boolean
  theme: Theme
  shortcuts: Array<{ action: string; keys: string }>
  onSave: (telemetryEnabled: boolean, theme: Theme) => Promise<void>
  saving: boolean
  saveStatus: { saved: boolean; error: string | null }
}

function GeneralTab({
  telemetryEnabled,
  theme,
  shortcuts,
  onSave,
  saving,
  saveStatus,
}: GeneralTabProps) {
  const [localTelemetry, setLocalTelemetry] = useState(telemetryEnabled)
  const [localTheme, setLocalTheme] = useState<Theme>(theme)

  // Sync if parent settings reload
  useEffect(() => {
    setLocalTelemetry(telemetryEnabled)
  }, [telemetryEnabled])

  useEffect(() => {
    setLocalTheme(theme)
  }, [theme])

  return (
    <div className="space-y-6">
      {/* Telemetry */}
      <div className="glass-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-nself-text text-sm font-semibold">
              Usage Telemetry
            </p>
            <p className="text-nself-text-muted mt-1 text-xs">
              Send anonymous usage data to help improve nSelf Admin. No
              credentials or project content is ever transmitted.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={localTelemetry}
            onClick={() => setLocalTelemetry((t) => !t)}
            className={`focus:ring-nself-primary focus:ring-offset-nself-bg relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
              localTelemetry ? 'bg-nself-primary' : 'bg-nself-border'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                localTelemetry ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Theme */}
      <div className="glass-card p-4">
        <p className="text-nself-text mb-3 text-sm font-semibold">Theme</p>
        <div className="flex gap-3">
          {(
            [
              {
                value: 'dark',
                label: 'Dark',
                icon: <Moon className="h-4 w-4" />,
              },
              {
                value: 'system',
                label: 'System',
                icon: <Monitor className="h-4 w-4" />,
              },
            ] as Array<{ value: Theme; label: string; icon: React.ReactNode }>
          ).map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setLocalTheme(value)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                localTheme === value
                  ? 'border-nself-primary bg-nself-primary/15 text-nself-primary'
                  : 'border-nself-border text-nself-text-muted hover:border-nself-primary/50 hover:text-nself-text'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Shortcuts (display only) */}
      <div className="glass-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Keyboard className="text-nself-text-muted h-4 w-4" />
          <p className="text-nself-text text-sm font-semibold">
            Keyboard Shortcuts
          </p>
        </div>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.action} className="flex items-center justify-between">
              <span className="text-nself-text-muted text-xs capitalize">
                {s.action.replace(/-/g, ' ')}
              </span>
              <kbd className="border-nself-border bg-nself-bg-card text-nself-text rounded border px-2 py-0.5 font-mono text-xs">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSave(localTelemetry, localTheme)}
          disabled={saving}
          className="nself-btn-primary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save General Settings
        </button>
        <SaveStatus saved={saveStatus.saved} error={saveStatus.error} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main SettingsPanel component
// ---------------------------------------------------------------------------

type TabId = 'credentials' | 'plugin-keys' | 'env-vars' | 'general'

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('credentials')
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Per-section save states
  const [envVarsSaving, setEnvVarsSaving] = useState(false)
  const [envVarsStatus, setEnvVarsStatus] = useState<{
    saved: boolean
    error: string | null
  }>({ saved: false, error: null })
  const [generalSaving, setGeneralSaving] = useState(false)
  const [generalStatus, setGeneralStatus] = useState<{
    saved: boolean
    error: string | null
  }>({ saved: false, error: null })

  // Track local env var edits separate from server state
  const [localEnvVars, setLocalEnvVars] = useState<Record<string, string>>({})
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---------------------------------------------------------------------------
  // Load settings on mount
  // ---------------------------------------------------------------------------

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as AdminSettings
      setSettings(data)
      setLocalEnvVars(data.envVars)
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Failed to load settings',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
    return () => {
      if (savedTimeout.current) {
        clearTimeout(savedTimeout.current)
      }
    }
  }, [loadSettings])

  // ---------------------------------------------------------------------------
  // Helpers: flash saved status
  // ---------------------------------------------------------------------------

  function flashSaved(
    setter: React.Dispatch<
      React.SetStateAction<{ saved: boolean; error: string | null }>
    >,
  ) {
    setter({ saved: true, error: null })
    savedTimeout.current = setTimeout(() => {
      setter({ saved: false, error: null })
    }, 2500)
  }

  function flashError(
    setter: React.Dispatch<
      React.SetStateAction<{ saved: boolean; error: string | null }>
    >,
    message: string,
  ) {
    setter({ saved: false, error: message })
    savedTimeout.current = setTimeout(() => {
      setter({ saved: false, error: null })
    }, 5000)
  }

  // ---------------------------------------------------------------------------
  // Handlers: credential operations (individual API routes)
  // ---------------------------------------------------------------------------

  async function handleUpdateCredential(
    key: string,
    value: string,
    description?: string,
  ) {
    const res = await fetch('/api/settings/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, description }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `HTTP ${res.status}`)
    }
    await loadSettings()
  }

  async function handleRemoveCredential(key: string) {
    const res = await fetch('/api/settings/credentials', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `HTTP ${res.status}`)
    }
    await loadSettings()
  }

  // ---------------------------------------------------------------------------
  // Handlers: plugin key operations
  // ---------------------------------------------------------------------------

  async function handleUpdatePluginKey(
    pluginName: string,
    envVar: string,
    value: string,
  ) {
    if (!settings) return
    const updated: AdminSettings = {
      ...settings,
      pluginKeys: [
        ...settings.pluginKeys.filter(
          (p) => !(p.pluginName === pluginName && p.envVar === envVar),
        ),
        { pluginName, envVar, value },
      ],
    }
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(body.error ?? `HTTP ${res.status}`)
    }
    await loadSettings()
  }

  // ---------------------------------------------------------------------------
  // Handlers: env vars save
  // ---------------------------------------------------------------------------

  async function handleSaveEnvVars() {
    if (!settings) return
    setEnvVarsSaving(true)
    try {
      const updated: AdminSettings = { ...settings, envVars: localEnvVars }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      await loadSettings()
      flashSaved(setEnvVarsStatus)
    } catch (err) {
      flashError(
        setEnvVarsStatus,
        err instanceof Error ? err.message : 'Failed to save',
      )
    } finally {
      setEnvVarsSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Handlers: general save
  // ---------------------------------------------------------------------------

  async function handleSaveGeneral(telemetryEnabled: boolean, theme: Theme) {
    if (!settings) return
    setGeneralSaving(true)
    try {
      const updated: AdminSettings = {
        ...settings,
        telemetry: { ...settings.telemetry, enabled: telemetryEnabled },
        theme,
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      await loadSettings()
      flashSaved(setGeneralStatus)
    } catch (err) {
      flashError(
        setGeneralStatus,
        err instanceof Error ? err.message : 'Failed to save',
      )
    } finally {
      setGeneralSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render: loading / error states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="text-nself-primary h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (fetchError || !settings) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm text-red-400">
          {fetchError ?? 'Failed to load settings'}
        </p>
        <button
          type="button"
          onClick={loadSettings}
          className="nself-btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: main panel
  // ---------------------------------------------------------------------------

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
    {
      id: 'credentials',
      label: 'Credentials',
      icon: <Key className="h-4 w-4" />,
    },
    {
      id: 'plugin-keys',
      label: 'Plugin Keys',
      icon: <Settings className="h-4 w-4" />,
    },
    {
      id: 'env-vars',
      label: 'Env Vars',
      icon: <Monitor className="h-4 w-4" />,
    },
    {
      id: 'general',
      label: 'General',
      icon: <Settings className="h-4 w-4" />,
    },
  ]

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="nself-gradient px-6 py-4">
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <p className="mt-0.5 text-sm text-white/70">
          Manage credentials, plugin keys, environment variables, and
          preferences.
        </p>
      </div>

      <div className="flex min-h-0 flex-col sm:flex-row">
        {/* Tab sidebar */}
        <nav
          className="border-nself-border flex flex-row gap-1 border-b p-3 sm:w-44 sm:flex-col sm:border-r sm:border-b-0"
          aria-label="Settings sections"
        >
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              icon={tab.icon}
              label={tab.label}
            />
          ))}
        </nav>

        {/* Tab content */}
        <div className="min-w-0 flex-1 p-6">
          {activeTab === 'credentials' && (
            <CredentialsTab
              credentials={settings.credentials}
              onUpdate={handleUpdateCredential}
              onRemove={handleRemoveCredential}
            />
          )}
          {activeTab === 'plugin-keys' && (
            <PluginKeysTab
              pluginKeys={settings.pluginKeys}
              onUpdate={handleUpdatePluginKey}
            />
          )}
          {activeTab === 'env-vars' && (
            <EnvVarsTab
              envVars={localEnvVars}
              onChange={setLocalEnvVars}
              onSave={handleSaveEnvVars}
              saving={envVarsSaving}
              saveStatus={envVarsStatus}
            />
          )}
          {activeTab === 'general' && (
            <GeneralTab
              telemetryEnabled={settings.telemetry.enabled}
              theme={settings.theme}
              shortcuts={settings.shortcuts}
              onSave={handleSaveGeneral}
              saving={generalSaving}
              saveStatus={generalStatus}
            />
          )}
        </div>
      </div>
    </div>
  )
}
