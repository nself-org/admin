'use client'

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Filter,
  KeyRound,
  Laptop2,
  Loader2,
  LogOut,
  Mail,
  Monitor,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  Smartphone,
  Trash2,
  Users,
  XCircle,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

const CLAW_API = 'http://127.0.0.1:3710'

function isNClawEnabled(): boolean {
  return process.env.NEXT_PUBLIC_NCLAW_ENABLED === 'true'
}

// ── Types ──────────────────────────────────────────────────────────────────────

type PluginStatus = 'checking' | 'running' | 'stopped'

type NClawSection =
  | 'overview'
  | 'accounts'
  | 'devices'
  | 'security'
  | 'secrets'
  | 'logs'

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

interface ServiceStatus {
  status: 'running' | 'stopped' | 'error'
  version?: string
  uptime_seconds?: number
  active_users?: number
}

interface ConnectedAccount {
  id: string
  provider: 'gmail' | 'calendar' | string
  email: string
  display_name?: string
  scopes: string[]
  connected_at: string
  last_synced_at?: string
  is_healthy: boolean
}

interface CompanionDevice {
  id: string
  name: string
  platform: 'ios' | 'android' | 'macos' | 'windows' | 'linux' | string
  last_seen_at: string
  created_at: string
}

interface EnvSecret {
  key: string
  present: boolean
  description: string
  required: boolean
}

interface LogEntry {
  ts: string
  level: LogLevel
  msg: string
  fields?: Record<string, unknown>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function platformIcon(platform: string) {
  switch (platform) {
    case 'ios':
      return <Phone className="h-4 w-4" />
    case 'android':
      return <Smartphone className="h-4 w-4" />
    case 'macos':
      return <Laptop2 className="h-4 w-4" />
    default:
      return <Monitor className="h-4 w-4" />
  }
}

const LOG_LEVEL_STYLES: Record<LogLevel, string> = {
  DEBUG: 'text-zinc-500',
  INFO: 'text-zinc-300',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PluginStatus }) {
  if (status === 'checking') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-zinc-600/50 bg-zinc-800/50 px-3 py-1 text-xs font-medium text-zinc-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking
      </span>
    )
  }
  if (status === 'running') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-900/20 px-3 py-1 text-xs font-medium text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        Running
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-900/20 px-3 py-1 text-xs font-medium text-red-400">
      <XCircle className="h-3 w-3" />
      Offline
    </span>
  )
}

// ── Overview section ──────────────────────────────────────────────────────────

function OverviewSection({ pluginDown }: { pluginDown: boolean }) {
  const [svc, setSvc] = useState<ServiceStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    if (pluginDown) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${CLAW_API}/health`, {
        signal: AbortSignal.timeout(4000),
      })
      if (!res.ok) {
        setSvc(null)
        return
      }
      const data = (await res.json()) as ServiceStatus
      setSvc(data)
    } catch {
      setSvc(null)
    } finally {
      setLoading(false)
    }
  }, [pluginDown])

  useEffect(() => {
    void fetchStatus()
    const id = setInterval(() => void fetchStatus(), 30000)
    return () => clearInterval(id)
  }, [fetchStatus])

  // Also fetch active user count from sessions endpoint
  const [activeUsers, setActiveUsers] = useState<number | null>(null)
  useEffect(() => {
    if (pluginDown) return
    fetch(`${CLAW_API}/claw/sessions?page=1&page_size=1`)
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{ total?: number; sessions?: unknown[] }>)
          : Promise.reject(),
      )
      .then((d) => setActiveUsers(d.total ?? d.sessions?.length ?? 0))
      .catch(() => setActiveUsers(null))
  }, [pluginDown])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-24 animate-pulse rounded-xl bg-zinc-800/50"
          />
        ))}
      </div>
    )
  }

  const stats = [
    {
      label: 'Service status',
      value:
        svc?.status === 'running'
          ? 'Running'
          : pluginDown
            ? 'Offline'
            : 'Unknown',
      sub: svc?.version ? `v${svc.version}` : undefined,
      icon: <Zap className="h-5 w-5" />,
      ok: svc?.status === 'running',
    },
    {
      label: 'Uptime',
      value:
        svc?.uptime_seconds != null ? formatUptime(svc.uptime_seconds) : '—',
      sub: svc?.uptime_seconds != null ? 'since last restart' : 'unavailable',
      icon: <Clock className="h-5 w-5" />,
      ok: svc?.uptime_seconds != null,
    },
    {
      label: 'Active users',
      value: activeUsers != null ? String(activeUsers) : '—',
      sub: 'with active sessions',
      icon: <Users className="h-5 w-5" />,
      ok: activeUsers != null,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase">
                {s.label}
              </p>
              <p
                className={`mt-1 text-2xl font-semibold ${s.ok ? 'text-white' : 'text-zinc-500'}`}
              >
                {s.value}
              </p>
              {s.sub && <p className="mt-0.5 text-xs text-zinc-500">{s.sub}</p>}
            </div>
            <div
              className={`rounded-lg p-2 ${
                s.ok
                  ? 'border border-sky-500/20 bg-sky-500/10 text-sky-400'
                  : 'border border-zinc-700/50 bg-zinc-700/30 text-zinc-600'
              }`}
            >
              {s.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Connected Accounts section ────────────────────────────────────────────────

function ConnectedAccountsSection({ pluginDown }: { pluginDown: boolean }) {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [addingOAuth, setAddingOAuth] = useState(false)

  const fetchAccounts = useCallback(async () => {
    if (pluginDown) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`${CLAW_API}/claw/accounts`)
      if (!res.ok) {
        setAccounts([])
        return
      }
      const data = (await res.json()) as { accounts: ConnectedAccount[] }
      setAccounts(data.accounts ?? [])
    } catch {
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [pluginDown])

  useEffect(() => {
    void fetchAccounts()
  }, [fetchAccounts])

  const handleTest = async (id: string) => {
    setTesting(id)
    try {
      await fetch(`${CLAW_API}/claw/accounts/${id}/test`, { method: 'POST' })
      await fetchAccounts()
    } catch {
      // ignore
    } finally {
      setTesting(null)
    }
  }

  const handleRefresh = async (id: string) => {
    setRefreshing(id)
    try {
      await fetch(`${CLAW_API}/claw/accounts/${id}/refresh`, { method: 'POST' })
      await fetchAccounts()
    } catch {
      // ignore
    } finally {
      setRefreshing(null)
    }
  }

  const handleRemove = async (id: string, email: string) => {
    if (!window.confirm(`Remove ${email}? This will revoke access.`)) return
    setRemoving(id)
    try {
      await fetch(`${CLAW_API}/claw/accounts/${id}`, { method: 'DELETE' })
      setAccounts((prev) => prev.filter((a) => a.id !== id))
    } catch {
      // ignore
    } finally {
      setRemoving(null)
    }
  }

  const handleAddAccount = async () => {
    setAddingOAuth(true)
    try {
      const res = await fetch(`${CLAW_API}/claw/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gmail' }),
      })
      if (res.ok) {
        const data = (await res.json()) as { oauth_url?: string }
        if (data.oauth_url) {
          window.open(data.oauth_url, '_blank', 'noopener,noreferrer')
        }
        // Poll for the account to appear
        setTimeout(() => void fetchAccounts(), 3000)
      }
    } catch {
      // ignore
    } finally {
      setAddingOAuth(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((n) => (
          <div
            key={n}
            className="h-16 animate-pulse rounded-xl bg-zinc-800/50"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          Google accounts connected to ɳClaw for Gmail and Calendar access.
        </p>
        <button
          type="button"
          onClick={handleAddAccount}
          disabled={addingOAuth || pluginDown}
          className="flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50"
        >
          {addingOAuth ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add account
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-12">
          <Mail className="mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-500">No accounts connected</p>
          <p className="mt-0.5 text-xs text-zinc-600">
            Add a Google account to enable Gmail and Calendar access
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-700/50 rounded-xl border border-zinc-700/50 bg-zinc-800/50">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center gap-4 px-4 py-3.5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/10">
                <Mail className="h-4 w-4 text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-zinc-200">
                    {account.email}
                  </p>
                  {account.is_healthy ? (
                    <span className="shrink-0 rounded-full bg-green-900/30 px-2 py-0.5 text-xs text-green-400">
                      healthy
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-red-900/30 px-2 py-0.5 text-xs text-red-400">
                      error
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  {account.scopes.join(', ')}
                  {account.last_synced_at
                    ? ` · synced ${timeAgo(account.last_synced_at)}`
                    : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleTest(account.id)}
                  disabled={testing === account.id}
                  title="Test connection"
                  className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-700/50 hover:text-zinc-300 disabled:opacity-50"
                >
                  {testing === account.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleRefresh(account.id)}
                  disabled={refreshing === account.id}
                  title="Refresh token"
                  className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-700/50 hover:text-zinc-300 disabled:opacity-50"
                >
                  {refreshing === account.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(account.id, account.email)}
                  disabled={removing === account.id}
                  title="Remove account"
                  className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-red-900/30 hover:text-red-400 disabled:opacity-50"
                >
                  {removing === account.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Companion Devices section ─────────────────────────────────────────────────

function CompanionDevicesSection({ pluginDown }: { pluginDown: boolean }) {
  const [devices, setDevices] = useState<CompanionDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const fetchDevices = useCallback(async () => {
    if (pluginDown) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`${CLAW_API}/claw/devices`)
      if (!res.ok) {
        setDevices([])
        return
      }
      const data = (await res.json()) as { devices: CompanionDevice[] }
      setDevices(data.devices ?? [])
    } catch {
      setDevices([])
    } finally {
      setLoading(false)
    }
  }, [pluginDown])

  useEffect(() => {
    void fetchDevices()
  }, [fetchDevices])

  const handleRevoke = async (id: string, name: string) => {
    if (!window.confirm(`Revoke access for "${name}"?`)) return
    setRevoking(id)
    try {
      await fetch(`${CLAW_API}/claw/devices/${id}`, { method: 'DELETE' })
      setDevices((prev) => prev.filter((d) => d.id !== id))
    } catch {
      // ignore
    } finally {
      setRevoking(null)
    }
  }

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return
    try {
      await fetch(`${CLAW_API}/claw/devices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      })
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, name: renameValue.trim() } : d)),
      )
      setRenaming(null)
      setRenameValue('')
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((n) => (
          <div
            key={n}
            className="h-14 animate-pulse rounded-xl bg-zinc-800/50"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/20 bg-amber-900/10 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-300/80">
            Companion device pairing endpoints are planned for Phase 224.
            Devices listed here are returned by the existing{' '}
            <code className="font-mono text-xs">/claw/devices</code> endpoint if
            available.
          </p>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-12">
          <Laptop2 className="mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-500">No companion devices</p>
          <p className="mt-0.5 text-xs text-zinc-600">
            Pair a device using the ɳClaw mobile or desktop client
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-700/50 rounded-xl border border-zinc-700/50 bg-zinc-800/50">
          {devices.map((device) => (
            <div key={device.id} className="px-4 py-3.5">
              {renaming === device.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    aria-label="Device name"
                    placeholder="Device name"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleRename(device.id)
                      if (e.key === 'Escape') {
                        setRenaming(null)
                        setRenameValue('')
                      }
                    }}
                    autoFocus
                    className="flex-1 rounded-lg border border-zinc-600/50 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => void handleRename(device.id)}
                    className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(null)
                      setRenameValue('')
                    }}
                    className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700/50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-700/50 text-zinc-400">
                    {platformIcon(device.platform)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200">
                      {device.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {device.platform} · last seen{' '}
                      {timeAgo(device.last_seen_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRenaming(device.id)
                        setRenameValue(device.name)
                      }}
                      title="Rename device"
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-700/50 hover:text-zinc-300"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevoke(device.id, device.name)}
                      disabled={revoking === device.id}
                      title="Revoke device"
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-900/30 hover:text-red-400 disabled:opacity-50"
                    >
                      {revoking === device.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Security section ──────────────────────────────────────────────────────────

function SecuritySection({ pluginDown }: { pluginDown: boolean }) {
  const [timeoutValue, setTimeoutValue] = useState('3600')
  const [savingTimeout, setSavingTimeout] = useState(false)
  const [timeoutSaved, setTimeoutSaved] = useState(false)
  const [rotatingKey, setRotatingKey] = useState<string | null>(null)
  const [rotateResult, setRotateResult] = useState<
    Record<string, { ok: boolean; msg: string }>
  >({})

  const handleSaveTimeout = async () => {
    setSavingTimeout(true)
    setTimeoutSaved(false)
    try {
      await fetch(`${CLAW_API}/claw/config/session-timeout`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeout_seconds: parseInt(timeoutValue, 10) }),
      })
      setTimeoutSaved(true)
      setTimeout(() => setTimeoutSaved(false), 3000)
    } catch {
      // ignore
    } finally {
      setSavingTimeout(false)
    }
  }

  const handleRotate = async (secretName: string) => {
    setRotatingKey(secretName)
    setRotateResult((prev) => {
      const next = { ...prev }
      delete next[secretName]
      return next
    })
    try {
      const res = await fetch(`${CLAW_API}/claw/secrets/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secretName }),
      })
      setRotateResult((prev) => ({
        ...prev,
        [secretName]: res.ok
          ? { ok: true, msg: 'Rotated successfully' }
          : { ok: false, msg: `Failed (HTTP ${res.status})` },
      }))
    } catch {
      setRotateResult((prev) => ({
        ...prev,
        [secretName]: { ok: false, msg: 'Request failed' },
      }))
    } finally {
      setRotatingKey(null)
    }
  }

  const secrets = [
    { key: 'NCLAW_JWT_SECRET', label: 'JWT signing secret', critical: true },
    { key: 'NCLAW_ENCRYPTION_KEY', label: 'Encryption key', critical: true },
    { key: 'NCLAW_WEBHOOK_SECRET', label: 'Webhook secret', critical: false },
  ]

  return (
    <div className="space-y-6">
      {/* Passkey enrollment */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">
                Passkey enrollment
              </h3>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Enroll a passkey for password-less admin authentication to ɳClaw.
            </p>
          </div>
          <button
            type="button"
            disabled={pluginDown}
            onClick={async () => {
              try {
                const res = await fetch(
                  `${CLAW_API}/claw/auth/passkey/enroll`,
                  {
                    method: 'POST',
                  },
                )
                if (res.ok) {
                  const data = (await res.json()) as { url?: string }
                  if (data.url)
                    window.open(data.url, '_blank', 'noopener,noreferrer')
                }
              } catch {
                // ignore
              }
            }}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50"
          >
            <Shield className="h-4 w-4" />
            Enroll passkey
          </button>
        </div>
      </div>

      {/* Session timeout */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-white">Session timeout</h3>
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          Inactive sessions are automatically invalidated after this duration.
        </p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="number"
              aria-label="Session timeout in seconds"
              value={timeoutValue}
              onChange={(e) => setTimeoutValue(e.target.value)}
              min="300"
              max="86400"
              className="w-32 rounded-lg border border-zinc-600/50 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500/50"
            />
            <span className="absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">
              sec
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveTimeout}
            disabled={savingTimeout || pluginDown}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50"
          >
            {savingTimeout ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save
          </button>
          {timeoutSaved && (
            <span className="flex items-center gap-1 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Saved
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          Min 300s (5 min) · Max 86400s (24 hr) · Default 3600s (1 hr)
        </p>
      </div>

      {/* Secret rotation */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-5">
        <div className="mb-1 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-white">Secret rotation</h3>
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          Rotate signing and encryption secrets. Values are never shown — only
          their status.
        </p>
        <div className="space-y-3">
          {secrets.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-4 py-3"
            >
              <div>
                <p className="font-mono text-sm text-zinc-300">{s.key}</p>
                <p className="text-xs text-zinc-500">{s.label}</p>
              </div>
              <div className="flex items-center gap-3">
                {rotateResult[s.key] && (
                  <span
                    className={`text-xs ${rotateResult[s.key].ok ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {rotateResult[s.key].msg}
                  </span>
                )}
                {s.critical && (
                  <span title="Critical — requires service restart">
                    <ShieldAlert className="h-4 w-4 text-yellow-500" />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRotate(s.key)}
                  disabled={rotatingKey === s.key || pluginDown}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                >
                  {rotatingKey === s.key ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Rotate
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-600">
          Rotating a critical secret invalidates all active sessions and
          requires a service restart.
        </p>
      </div>
    </div>
  )
}

// ── Plugin Secrets section ────────────────────────────────────────────────────

const NCLAW_ENV_SECRETS: EnvSecret[] = [
  {
    key: 'NCLAW_GOOGLE_CLIENT_ID',
    description: 'Google OAuth client ID for account linking',
    present: false,
    required: true,
  },
  {
    key: 'NCLAW_GOOGLE_CLIENT_SECRET',
    description: 'Google OAuth client secret',
    present: false,
    required: true,
  },
  {
    key: 'NCLAW_JWT_SECRET',
    description: 'JWT signing secret (min 32 chars)',
    present: false,
    required: true,
  },
  {
    key: 'NCLAW_ENCRYPTION_KEY',
    description: 'AES-256 encryption key for stored tokens',
    present: false,
    required: true,
  },
  {
    key: 'NCLAW_WEBHOOK_SECRET',
    description: 'Webhook HMAC verification secret',
    present: false,
    required: false,
  },
  {
    key: 'NCLAW_OPENAI_API_KEY',
    description: 'OpenAI key (falls back to nself-ai if unset)',
    present: false,
    required: false,
  },
]

function PluginSecretsSection({ pluginDown }: { pluginDown: boolean }) {
  const [secrets, setSecrets] = useState<EnvSecret[]>(NCLAW_ENV_SECRETS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (pluginDown) {
      setLoading(false)
      return
    }
    fetch(`${CLAW_API}/claw/env/status`)
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{ vars: Record<string, boolean> }>)
          : Promise.reject(),
      )
      .then((data) => {
        setSecrets((prev) =>
          prev.map((s) => ({
            ...s,
            present: data.vars[s.key] ?? false,
          })),
        )
      })
      .catch(() => {
        // leave as-is — we'll show all as unknown
      })
      .finally(() => setLoading(false))
  }, [pluginDown])

  const allRequired = secrets.filter((s) => s.required)
  const missingRequired = allRequired.filter((s) => !s.present)

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-12 animate-pulse rounded-lg bg-zinc-800/50"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {missingRequired.length > 0 && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
            <div>
              <p className="text-sm font-medium text-yellow-300">
                {missingRequired.length} required secret
                {missingRequired.length > 1 ? 's' : ''} missing
              </p>
              <p className="mt-0.5 text-xs text-yellow-400/80">
                Set them in your <code className="font-mono">.env</code> file
                and run <code className="font-mono">nself build</code> to apply.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-zinc-700/50 rounded-xl border border-zinc-700/50 bg-zinc-800/50">
        {secrets.map((s) => (
          <div key={s.key} className="flex items-center gap-4 px-4 py-3.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center">
              {s.present ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : s.required ? (
                <XCircle className="h-4 w-4 text-red-400" />
              ) : (
                <Eye className="h-4 w-4 text-zinc-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm text-zinc-200">{s.key}</code>
                {s.required ? (
                  <span className="rounded-full bg-zinc-700/60 px-1.5 py-0.5 text-xs text-zinc-400">
                    required
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-600">
                    optional
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">{s.description}</p>
            </div>
            <div className="shrink-0 text-right">
              {s.present ? (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  set
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-zinc-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                  missing
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 px-4 py-3">
        <div className="flex items-start gap-2">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
          <p className="text-xs text-zinc-500">
            Secret values are never displayed here — only presence status. Edit
            them in your <code className="font-mono">.env</code> file and run{' '}
            <code className="font-mono">nself build</code> to regenerate the
            Docker configuration.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Logs section ──────────────────────────────────────────────────────────────

const LOG_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR']

function LogsSection({ pluginDown }: { pluginDown: boolean }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'ALL'>('ALL')
  const [autoScroll, setAutoScroll] = useState(true)
  const [lines, setLines] = useState(100)
  const containerRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLogs = useCallback(async () => {
    if (pluginDown) {
      setLoading(false)
      return
    }
    try {
      const params = new URLSearchParams({ lines: String(lines) })
      if (levelFilter !== 'ALL') params.set('level', levelFilter)
      const res = await fetch(`${CLAW_API}/claw/logs?${params.toString()}`)
      if (!res.ok) return
      const data = (await res.json()) as { logs: LogEntry[] }
      setLogs(data.logs ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [pluginDown, levelFilter, lines])

  useEffect(() => {
    void fetchLogs()
    pollRef.current = setInterval(() => void fetchLogs(), 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchLogs])

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const filteredLogs =
    levelFilter === 'ALL' ? logs : logs.filter((l) => l.level === levelFilter)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-1">
          {(['ALL', ...LOG_LEVELS] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevelFilter(lvl)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                levelFilter === lvl
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-zinc-500" />
          <select
            aria-label="Log lines to display"
            value={lines}
            onChange={(e) => setLines(Number(e.target.value))}
            className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-2 py-1 text-xs text-zinc-300 outline-none"
          >
            {[50, 100, 250, 500].map((n) => (
              <option key={n} value={n}>
                {n} lines
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => void fetchLogs()}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>

        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500 select-none">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          Auto-scroll
        </label>
      </div>

      {/* Log viewer */}
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-zinc-800/50" />
      ) : pluginDown ? (
        <div className="flex items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <p className="text-sm text-zinc-500">
            Plugin offline — no logs available
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="h-80 overflow-y-auto rounded-xl border border-zinc-700/50 bg-zinc-900/80 p-4 font-mono text-xs"
        >
          {filteredLogs.length === 0 ? (
            <p className="text-zinc-600">No log entries</p>
          ) : (
            filteredLogs.map((entry, i) => (
              <div key={i} className="flex gap-3 py-0.5">
                <span className="shrink-0 text-zinc-600">
                  {new Date(entry.ts).toLocaleTimeString()}
                </span>
                <span
                  className={`w-10 shrink-0 font-semibold uppercase ${LOG_LEVEL_STYLES[entry.level] ?? 'text-zinc-400'}`}
                >
                  {entry.level}
                </span>
                <span className="break-all text-zinc-300">{entry.msg}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NClawPage() {
  const [pluginStatus, setPluginStatus] = useState<PluginStatus>('checking')
  const [activeSection, setActiveSection] = useState<NClawSection>('overview')
  const [refreshingStatus, setRefreshingStatus] = useState(false)

  const checkHealth = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshingStatus(true)
    else setPluginStatus('checking')
    try {
      const res = await fetch(`${CLAW_API}/health`, {
        signal: AbortSignal.timeout(4000),
      })
      setPluginStatus(res.ok ? 'running' : 'stopped')
    } catch {
      setPluginStatus('stopped')
    } finally {
      setRefreshingStatus(false)
    }
  }, [])

  useEffect(() => {
    void checkHealth()
    const id = setInterval(() => void checkHealth(true), 30000)
    return () => clearInterval(id)
  }, [checkHealth])

  // Feature flag gate
  if (!isNClawEnabled()) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">ɳClaw</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            AI assistant plugin management
          </p>
        </div>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-8 text-center">
          <Shield className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm font-medium text-zinc-300">
            ɳClaw is not enabled
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Set{' '}
            <code className="font-mono text-xs">
              NEXT_PUBLIC_NCLAW_ENABLED=true
            </code>{' '}
            to activate this section, then run{' '}
            <code className="font-mono text-xs">nself build</code>.
          </p>
        </div>
      </div>
    )
  }

  const pluginDown = pluginStatus === 'stopped'

  const sections: { id: NClawSection; label: string; icon: React.ReactNode }[] =
    [
      { id: 'overview', label: 'Overview', icon: <Zap className="h-4 w-4" /> },
      {
        id: 'accounts',
        label: 'Connected Accounts',
        icon: <Mail className="h-4 w-4" />,
      },
      {
        id: 'devices',
        label: 'Companion Devices',
        icon: <Laptop2 className="h-4 w-4" />,
      },
      {
        id: 'security',
        label: 'Security',
        icon: <Shield className="h-4 w-4" />,
      },
      {
        id: 'secrets',
        label: 'Plugin Secrets',
        icon: <KeyRound className="h-4 w-4" />,
      },
      { id: 'logs', label: 'Logs', icon: <Filter className="h-4 w-4" /> },
    ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">ɳClaw</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            AI assistant plugin management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={pluginStatus} />
          <button
            type="button"
            onClick={() => checkHealth(true)}
            disabled={refreshingStatus}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            {refreshingStatus ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Plugin offline warning */}
      {pluginDown && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">
                nself-claw is not running
              </p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Install and start the claw plugin to use this section.
              </p>
              <div className="mt-3 rounded-lg bg-zinc-900/50 px-3 py-2 font-mono text-xs text-zinc-300">
                nself plugin install claw
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section nav */}
      <div className="flex w-fit flex-wrap gap-1 rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-1">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === s.id
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div>
        {activeSection === 'overview' && (
          <OverviewSection pluginDown={pluginDown} />
        )}
        {activeSection === 'accounts' && (
          <ConnectedAccountsSection pluginDown={pluginDown} />
        )}
        {activeSection === 'devices' && (
          <CompanionDevicesSection pluginDown={pluginDown} />
        )}
        {activeSection === 'security' && (
          <SecuritySection pluginDown={pluginDown} />
        )}
        {activeSection === 'secrets' && (
          <PluginSecretsSection pluginDown={pluginDown} />
        )}
        {activeSection === 'logs' && <LogsSection pluginDown={pluginDown} />}
      </div>
    </div>
  )
}
