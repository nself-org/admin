'use client'

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  RotateCw,
  Shield,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

const AI_API = 'http://127.0.0.1:8010'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PoolCapacity {
  total_rpd: number
  used_rpd: number
  reset_at: string
  accounts_total: number
  accounts_active: number
  accounts_rate_limited: number
  accounts_exhausted: number
  accounts_revoked: number
}

interface PoolAccount {
  id: string
  email: string
  status: 'active' | 'rate_limited' | 'exhausted' | 'revoked' | 'error'
  project: string
  key_fingerprint: string
  usage_today: number
  daily_limit: number
  last_used: string | null
}

interface AuditEntry {
  timestamp: string
  action: string
  account_email: string
  detail: string
}

type PageState = 'loading' | 'ready' | 'error' | 'empty'

const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-400',
  rate_limited: 'text-yellow-400',
  exhausted: 'text-zinc-500',
  revoked: 'text-red-400',
  error: 'text-red-400',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GeminiPoolPage() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [error, setError] = useState('')
  const [capacity, setCapacity] = useState<PoolCapacity | null>(null)
  const [accounts, setAccounts] = useState<PoolAccount[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [provisionLogs, setProvisionLogs] = useState<string[]>([])
  const [provisionDone, setProvisionDone] = useState(false)
  const [provisionError, setProvisionError] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testingAll, setTestingAll] = useState(false)
  const [rotating, setRotating] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [showAudit, setShowAudit] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const fetchAll = useCallback(async () => {
    setPageState('loading')
    setError('')
    try {
      const [cRes, aRes] = await Promise.all([
        fetch(`${AI_API}/ai/pool/status`),
        fetch(`${AI_API}/ai/pool/keys`),
      ])
      if (!cRes.ok) throw new Error(`HTTP ${cRes.status}`)
      const cap: PoolCapacity = await cRes.json()
      setCapacity(cap)
      setAccounts(aRes.ok ? (await aRes.json()).accounts ?? [] : [])
      setPageState(cap.accounts_total === 0 ? 'empty' : 'ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pool status.')
      setPageState('error')
    }
  }, [])

  useEffect(() => {
    fetchAll()
    return () => { eventSourceRef.current?.close() }
  }, [fetchAll])

  function formatResetCountdown(resetAt: string): string {
    const diff = new Date(resetAt).getTime() - Date.now()
    if (diff <= 0) return 'Resetting now'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  async function startOAuth() {
    setProvisionLogs([])
    setProvisionDone(false)
    setProvisionError(false)
    try {
      const res = await fetch(`${AI_API}/ai/pool/oauth/start`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.oauth_url) window.open(data.oauth_url, '_blank')
      const es = new EventSource(`${AI_API}/ai/pool/events?session=${data.session_id}`)
      eventSourceRef.current = es
      es.onmessage = (ev) => {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'step') {
          setProvisionLogs((prev) => [...prev, msg.message])
        } else if (msg.type === 'done') {
          setProvisionDone(true)
          es.close()
        } else if (msg.type === 'error') {
          setProvisionLogs((prev) => [...prev, `Error: ${msg.message}`])
          setProvisionError(true)
          es.close()
        }
      }
      es.onerror = () => { es.close(); setProvisionError(true) }
    } catch {
      setProvisionLogs(['Failed to start OAuth flow.'])
      setProvisionError(true)
    }
  }

  async function testAccount(id: string) {
    setTesting(id)
    try {
      await fetch(`${AI_API}/ai/pool/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: id }),
      })
      await fetchAll()
    } catch {
      setError(`Test failed for account ${id}.`)
    }
    setTesting(null)
  }

  async function testAll() {
    setTestingAll(true)
    try {
      await fetch(`${AI_API}/ai/pool/test`, { method: 'POST' })
      await fetchAll()
    } catch {
      setError('Test all failed.')
    }
    setTestingAll(false)
  }

  async function rotateKey(id: string) {
    setRotating(id)
    try {
      await fetch(`${AI_API}/ai/pool/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: id }),
      })
      await fetchAll()
    } catch {
      setError('Key rotation failed.')
    }
    setRotating(null)
  }

  async function removeAccount(id: string) {
    setRemoving(id)
    try {
      await fetch(`${AI_API}/ai/pool/keys/${id}`, { method: 'DELETE' })
      await fetchAll()
    } catch {
      setError('Failed to remove account.')
    }
    setRemoving(null)
  }

  async function fetchAudit() {
    try {
      const res = await fetch(`${AI_API}/ai/pool/audit`)
      if (res.ok) setAudit((await res.json()).entries ?? [])
    } catch { /* ignore */ }
    setShowAudit(true)
  }

  // ── Empty State ───────────────────────────────────────────────────────────

  if (pageState === 'empty') {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-100">Gemini Pool</h1>
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-8 text-center">
          <Key className="mx-auto mb-4 h-12 w-12 text-sky-400/50" />
          <h2 className="mb-2 text-lg font-medium text-zinc-200">No Google Accounts Connected</h2>
          <p className="mb-6 text-sm text-zinc-400">
            Connect your first Google account for 20 free requests per day. No credit card, no paid tier.
          </p>
          <button
            onClick={() => { setShowAddModal(true); startOAuth() }}
            className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-400 transition"
          >
            <Plus className="mr-2 inline h-4 w-4" />
            Connect Google Account
          </button>
        </div>
        {showAddModal && <ProvisionModal />}
      </div>
    )
  }

  // ── Loading State ─────────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-100">Gemini Pool</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 animate-pulse rounded-xl bg-zinc-800/50" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error State ───────────────────────────────────────────────────────────

  if (pageState === 'error') {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-100">Gemini Pool</h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <p className="mb-4 text-sm text-red-300">{error}</p>
          <button onClick={fetchAll} className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-200 hover:bg-red-500/30 transition">
            Retry
          </button>
        </div>
      </div>
    )
  }

  function ProvisionModal() {
    const steps = [
      'OAuth authorized',
      'Listing projects',
      'Creating project',
      'Enabling Gemini API',
      'Creating API key',
      'Encrypting',
      'Adding to pool',
      'Done',
    ]
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-zinc-100">Connecting Google Account</h3>
            {(provisionDone || provisionError) && (
              <button onClick={() => { setShowAddModal(false); if (provisionDone) fetchAll() }} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="mb-4 rounded-lg border border-zinc-800 bg-black/30 p-4">
            <p className="mb-3 text-xs text-zinc-400">nClaw will:</p>
            <ul className="space-y-1.5 text-xs text-zinc-400">
              {steps.map((step, i) => {
                const completed = i < provisionLogs.length
                const current = i === provisionLogs.length - 1 && !provisionDone
                return (
                  <li key={i} className={`flex items-center gap-2 ${completed ? 'text-zinc-200' : ''}`}>
                    {completed ? (
                      <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-green-400" />
                    ) : current ? (
                      <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin text-sky-400" />
                    ) : (
                      <span className="h-3 w-3 flex-shrink-0 rounded-full border border-zinc-700" />
                    )}
                    {step}
                  </li>
                )
              })}
            </ul>
          </div>
          {provisionDone && (
            <button
              onClick={() => { setShowAddModal(false); fetchAll() }}
              className="w-full rounded-lg bg-sky-500 py-2 text-sm font-medium text-white hover:bg-sky-400 transition"
            >
              Done
            </button>
          )}
          {provisionError && (
            <button
              onClick={() => { startOAuth() }}
              className="w-full rounded-lg bg-red-600/20 py-2 text-sm font-medium text-red-300 hover:bg-red-600/30 transition"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Ready State ───────────────────────────────────────────────────────────

  const usedPct = capacity ? Math.round((capacity.used_rpd / capacity.total_rpd) * 100) : 0

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Gemini Pool</h1>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── Pool Capacity ─────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-200">Pool Capacity</h2>
          <div className="flex items-center gap-2">
            <button onClick={testAll} disabled={testingAll} className="rounded-lg border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition disabled:opacity-50">
              {testingAll ? <Loader2 className="inline h-3 w-3 animate-spin" /> : <><Zap className="mr-1 inline h-3 w-3" />Test All</>}
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
            <span>{capacity?.used_rpd ?? 0} / {capacity?.total_rpd ?? 0} RPD used</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Resets in {capacity ? formatResetCountdown(capacity.reset_at) : '-'}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-sky-500 transition-all"
              style={{ width: `${Math.min(usedPct, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <p className="text-lg font-semibold text-zinc-200">{capacity?.accounts_active ?? 0}</p>
            <p className="text-zinc-500">Active</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-yellow-400">{capacity?.accounts_rate_limited ?? 0}</p>
            <p className="text-zinc-500">Rate Limited</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-zinc-500">{capacity?.accounts_exhausted ?? 0}</p>
            <p className="text-zinc-500">Exhausted</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-red-400">{capacity?.accounts_revoked ?? 0}</p>
            <p className="text-zinc-500">Revoked</p>
          </div>
        </div>
      </section>

      {/* ── Connected Accounts ────────────────────────────────────────────── */}
      <section className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-200">Connected Accounts</h2>
          <button
            onClick={() => { setShowAddModal(true); startOAuth() }}
            className="rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs text-sky-300 hover:bg-sky-500/30 transition"
          >
            <Plus className="mr-1 inline h-3 w-3" /> Add Account
          </button>
        </div>

        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200 truncate">{a.email}</span>
                    <span className={`text-xs capitalize ${STATUS_COLORS[a.status] ?? 'text-zinc-500'}`}>
                      {a.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                    <span>{a.project}</span>
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {a.key_fingerprint}
                    </span>
                    <span>{a.usage_today}/{a.daily_limit} RPD</span>
                    {a.last_used && <span>Last: {new Date(a.last_used).toLocaleTimeString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => testAccount(a.id)}
                    disabled={testing === a.id}
                    className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-50"
                    title="Test"
                  >
                    {testing === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => rotateKey(a.id)}
                    disabled={rotating === a.id}
                    className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-50"
                    title="Rotate key"
                  >
                    {rotating === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => removeAccount(a.id)}
                    disabled={removing === a.id}
                    className="rounded p-1.5 text-red-500/50 hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
                    title="Remove"
                  >
                    {removing === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Audit Log ─────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-200">Audit Log</h2>
          <button onClick={fetchAudit} className="text-xs text-sky-400 hover:text-sky-300">
            View Full Log
          </button>
        </div>
        {showAudit && audit.length > 0 && (
          <div className="mt-3 max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="pb-1 pr-3">Time</th>
                  <th className="pb-1 pr-3">Action</th>
                  <th className="pb-1 pr-3">Account</th>
                  <th className="pb-1">Detail</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((e, i) => (
                  <tr key={i} className="border-t border-zinc-800/50 text-zinc-400">
                    <td className="py-1.5 pr-3">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="py-1.5 pr-3">{e.action}</td>
                    <td className="py-1.5 pr-3">{e.account_email}</td>
                    <td className="py-1.5">{e.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showAddModal && <ProvisionModal />}
    </div>
  )
}
