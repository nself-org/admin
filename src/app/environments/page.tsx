'use client'

import { HeroPattern } from '@/components/HeroPattern'
import type {
  ControlPlaneInventory,
  ControlPlaneServer,
  ServerCapability,
} from '@/types/deployment'
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  EyeOff,
  GitBranch,
  Lock,
  Plus,
  RefreshCw,
  Server,
  ShieldAlert,
  WifiOff,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

// ── Capability badge ─────────────────────────────────────────────────────────

function CapabilityBadge({ capability }: { capability: ServerCapability }) {
  switch (capability) {
    case 'manage':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="h-3 w-3" aria-hidden="true" />
          manage
        </span>
      )
    case 'read-only':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Lock className="h-3 w-3" aria-hidden="true" />
          read-only
        </span>
      )
    case 'hidden':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
          <EyeOff className="h-3 w-3" aria-hidden="true" />
          hidden
        </span>
      )
  }
}

// ── Server card ───────────────────────────────────────────────────────────────

function ServerCard({ server }: { server: ControlPlaneServer }) {
  if (server.capability === 'hidden') return null

  return (
    <div
      className={`rounded-lg border p-3 ${
        server.capability === 'manage'
          ? 'border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-900/10'
          : 'border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/10'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-zinc-900 dark:text-white">
              {server.name}
            </span>
            {server.primary && (
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                primary
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {server.host} · {server.role}
          </p>
          {server.reason && server.reason.length > 0 && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {server.reason[0]}
            </p>
          )}
        </div>
        <CapabilityBadge capability={server.capability} />
      </div>
    </div>
  )
}

// ── Partial-access banner ─────────────────────────────────────────────────────

function PartialAccessBanner({ servers }: { servers: ControlPlaneServer[] }) {
  const limited = servers.filter(
    (s) => s.capability === 'read-only' || s.capability === 'hidden',
  )
  if (limited.length === 0) return null

  const reasons = Array.from(
    new Set(limited.flatMap((s) => s.reason ?? [])),
  ).slice(0, 3)

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Partial access — {limited.length} server
            {limited.length > 1 ? 's' : ''} with limited capability
          </p>
          {reasons.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {reasons.map((r) => (
                <li key={r} className="text-xs text-amber-700 dark:text-amber-400">
                  · {r}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
            Run <code className="font-mono">nself env target probe</code> to
            diagnose and fix access.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Add server modal ──────────────────────────────────────────────────────────

interface AddServerModalProps {
  onClose: () => void
  onAdded: () => void
}

function AddServerModal({ onClose, onAdded }: AddServerModalProps) {
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [role, setRole] = useState('primary')
  const [sshUser, setSshUser] = useState('')
  const [sshKeyPath, setSshKeyPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Focus trap: auto-focus first field; trap Tab within modal; Escape closes.
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<Element | null>(null)

  useEffect(() => {
    // Save the element that opened the modal so we can restore focus on close.
    triggerRef.current = document.activeElement
    firstInputRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the element that triggered the modal.
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus()
      }
    }
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/control-plane', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          name: name.trim(),
          host: host.trim(),
          role: role.trim(),
          ...(sshUser.trim() ? { sshUser: sshUser.trim() } : {}),
          ...(sshKeyPath.trim() ? { sshKeyPath: sshKeyPath.trim() } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setErr(data.error ?? 'Failed to add server')
      } else {
        onAdded()
        onClose()
      }
    } catch {
      setErr('Network error — could not reach API')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-server-title"
      ref={dialogRef}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="add-server-title"
            className="text-lg font-semibold text-zinc-900 dark:text-white"
          >
            Add Server to Inventory
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add server dialog"
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <XCircle className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="add-server-name"
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Name
            </label>
            <input
              id="add-server-name"
              required
              ref={firstInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="prod-01"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="add-server-host"
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Host / IP
            </label>
            <input
              id="add-server-host"
              required
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="5.75.235.42"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="add-server-role"
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Role
            </label>
            <select
              id="add-server-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="primary">primary</option>
              <option value="secondary">secondary</option>
              <option value="worker">worker</option>
              <option value="edge">edge</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="add-server-ssh-user"
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              SSH User{' '}
              <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              id="add-server-ssh-user"
              value={sshUser}
              onChange={(e) => setSshUser(e.target.value)}
              placeholder="deploy"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="add-server-ssh-key"
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              SSH Key Path{' '}
              <span className="text-zinc-400">(optional — path only, not key content)</span>
            </label>
            <input
              id="add-server-ssh-key"
              value={sshKeyPath}
              onChange={(e) => setSshKeyPath(e.target.value)}
              placeholder="/home/user/.ssh/id_rsa"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          {err && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {err}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Env color helper ──────────────────────────────────────────────────────────

function getEnvGradient(name: string): string {
  switch (name.toLowerCase()) {
    case 'local':
    case 'development':
      return 'from-blue-600 to-cyan-400 dark:from-blue-400 dark:to-cyan-300'
    case 'staging':
      return 'from-yellow-600 to-orange-400 dark:from-yellow-400 dark:to-orange-300'
    case 'production':
    case 'prod':
      return 'from-red-600 to-pink-400 dark:from-red-400 dark:to-pink-300'
    default:
      return 'from-sky-500 to-blue-400 dark:from-sky-400 dark:to-blue-300'
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EnvironmentsPage() {
  const [loading, setLoading] = useState(true)
  const [inventory, setInventory] = useState<ControlPlaneInventory | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchInventory = useCallback(async (isRefresh = false, signal?: AbortSignal) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    setOffline(false)

    try {
      const res = await fetch('/api/control-plane?action=list', { signal })
      if (res.status === 401 || res.status === 403) {
        // Unauth state — redirect to login
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      if (!res.ok || !data.success) {
        // 502 = CLI returned non-JSON (nself not running / offline)
        if (res.status === 502 || (data.error && data.error.includes('non-JSON'))) {
          setOffline(true)
        } else {
          setError(data.error ?? 'Failed to load server inventory')
        }
        return
      }
      // data.data is the parsed CLI JSON — could be ControlPlaneInventory or flat list
      const raw = data.data
      if (raw && typeof raw === 'object' && 'environments' in raw) {
        setInventory(raw as ControlPlaneInventory)
      } else if (Array.isArray(raw)) {
        // Flat array of environments — normalize
        setInventory({ environments: raw as ControlPlaneInventory['environments'] })
      } else {
        setInventory({ environments: [] })
      }
    } catch (err) {
      // Ignore aborted fetches — component unmounted; no setState after unmount.
      if (err instanceof Error && err.name === 'AbortError') return
      setOffline(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchInventory(false, controller.signal)
    return () => controller.abort()
  }, [fetchInventory])

  // ── Offline state ──────────────────────────────────────────────────────────
  if (offline) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <PageHeader />
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white py-20 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <WifiOff className="mb-4 h-12 w-12 text-zinc-400" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
              nself is not responding
            </h2>
            <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              The nself CLI could not be reached. Make sure{' '}
              <code className="font-mono">nself</code> is installed and your
              project is configured.
            </p>
            <button
              onClick={() => fetchInventory()}
              className="mt-6 flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <PageHeader />
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
              />
            ))}
          </div>
        </div>
      </>
    )
  }

  const allServers = inventory?.environments.flatMap((e) => e.servers) ?? []
  const hasPartialAccess = allServers.some(
    (s) => s.capability === 'read-only' || s.capability === 'hidden',
  )

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <PageHeader />
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
              <button
                onClick={() => fetchInventory()}
                className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!inventory || inventory.environments.length === 0) {
    return (
      <>
        <HeroPattern />
        <div className="relative mx-auto max-w-7xl">
          <PageHeader
            onAdd={() => setShowAddModal(true)}
            onRefresh={() => fetchInventory(true)}
            refreshing={refreshing}
          />
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-white py-20 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <Server className="mb-4 h-12 w-12 text-zinc-400" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
              No servers in inventory
            </h2>
            <p className="mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              Add a server to get started. Servers are managed by{' '}
              <code className="font-mono">nself env target add</code>.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-6 flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add First Server
            </button>
          </div>
          {showAddModal && (
            <AddServerModal
              onClose={() => setShowAddModal(false)}
              onAdded={() => fetchInventory()}
            />
          )}
        </div>
      </>
    )
  }

  // ── Partial-access (mixed capabilities) ────────────────────────────────────
  // ── Success — render environment + server cards ────────────────────────────
  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        <PageHeader
          onAdd={() => setShowAddModal(true)}
          onRefresh={() => fetchInventory(true)}
          refreshing={refreshing}
        />

        {hasPartialAccess && <PartialAccessBanner servers={allServers} />}

        <div className="grid gap-6 md:grid-cols-2">
          {inventory.environments.map((env) => {
            const visibleServers = env.servers.filter(
              (s) => s.capability !== 'hidden',
            )
            const allManage = visibleServers.every(
              (s) => s.capability === 'manage',
            )
            const hasReadOnly = visibleServers.some(
              (s) => s.capability === 'read-only',
            )

            return (
              <div
                key={env.name}
                className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                {/* Env header */}
                <Link
                  href={`/environments/${env.name}`}
                  className="group flex items-center justify-between rounded-t-xl p-5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r ${getEnvGradient(env.name)}`}
                    >
                      <Server className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold capitalize text-zinc-900 dark:text-white">
                        {env.name}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {env.kind} · {env.servers.length} server
                        {env.servers.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {allManage && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" aria-hidden="true" />
                        full access
                      </span>
                    )}
                    {hasReadOnly && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        partial
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </div>
                </Link>

                {/* Server cards */}
                {visibleServers.length > 0 ? (
                  <div className="space-y-2 border-t border-zinc-100 p-4 dark:border-zinc-700">
                    {visibleServers.map((s) => (
                      <ServerCard key={s.name} server={s} />
                    ))}
                  </div>
                ) : (
                  <div className="border-t border-zinc-100 p-4 text-center dark:border-zinc-700">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      All servers hidden (no access)
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* CLI reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
            CLI Commands
          </h3>
          <div className="space-y-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
            <p>
              <span className="text-sky-500">nself env target list</span> — list
              inventory
            </p>
            <p>
              <span className="text-sky-500">nself env target probe</span> —
              probe capability
            </p>
            <p>
              <span className="text-sky-500">
                nself env target add &lt;name&gt; --host &lt;host&gt; --role
                &lt;role&gt;
              </span>{' '}
              — add server
            </p>
            <p>
              <span className="text-sky-500">
                nself deploy &lt;env&gt; --server &lt;name&gt;
              </span>{' '}
              — deploy to server
            </p>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddServerModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => fetchInventory()}
        />
      )}
    </>
  )
}

// ── Page header (shared across states) ───────────────────────────────────────

function PageHeader({
  onAdd,
  onRefresh,
  refreshing,
}: {
  onAdd?: () => void
  onRefresh?: () => void
  refreshing?: boolean
} = {}) {
  return (
    <div className="mb-8 border-b border-zinc-200 pb-6 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-sky-400 dark:to-pink-300">
            Environments
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Server inventory and deployment targets — powered by{' '}
            <code className="font-mono text-sm">nself env target</code>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              aria-label={refreshing ? 'Refreshing inventory' : 'Refresh inventory'}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
          <Link
            href="/environments/diff"
            className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            Compare
          </Link>
          {onAdd && (
            <button
              onClick={onAdd}
              aria-label="Add server to inventory"
              className="flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Server
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
