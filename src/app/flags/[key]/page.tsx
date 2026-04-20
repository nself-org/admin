'use client'

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Loader2,
  Power,
  PowerOff,
  Shield,
  Skull,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

// ---- Types ------------------------------------------------------------------

type FlagType = 'release' | 'ops' | 'experiment' | 'kill_switch'

interface FeatureFlag {
  id: string
  key: string
  name: string | null
  description: string | null
  type: FlagType | null
  enabled: boolean
  rollout_pct: number | null
  default_value: unknown
  rules: unknown[]
  created_at: string
  updated_at: string
}

interface AuditEntry {
  id: string
  flag_key: string
  actor: string
  action: string
  before: unknown
  after: unknown
  reason: string | null
  ts: string
}

// ---- Constants --------------------------------------------------------------

const FLAGS_API = 'http://127.0.0.1:3305/v1'

const TYPE_META: Record<FlagType, { label: string; color: string }> = {
  release: { label: 'Release', color: 'text-sky-400 bg-sky-900/30 border-sky-700/50' },
  ops: { label: 'Ops', color: 'text-amber-400 bg-amber-900/30 border-amber-700/50' },
  experiment: { label: 'Experiment', color: 'text-violet-400 bg-violet-900/30 border-violet-700/50' },
  kill_switch: { label: 'Kill Switch', color: 'text-red-400 bg-red-900/30 border-red-700/50' },
}

// ---- Helpers ----------------------------------------------------------------

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

// ---- Sub-components ---------------------------------------------------------

function RolloutSlider({
  current,
  onSave,
  saving,
}: {
  current: number | null
  onSave: (pct: number) => Promise<void>
  saving: boolean
}) {
  const [pct, setPct] = useState<number>(current ?? 0)
  const [dirty, setDirty] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleChange = (v: number) => {
    setPct(v)
    setDirty(v !== (current ?? 0))
  }

  const handleConfirm = async () => {
    setConfirmOpen(false)
    await onSave(pct)
    setDirty(false)
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">Rollout Percentage</span>
        <span className="text-lg font-semibold text-sky-400">{pct}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="w-full accent-sky-500"
      />
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>0% (off)</span>
        <span>100% (full rollout)</span>
      </div>
      {dirty && !confirmOpen && (
        <button
          onClick={() => setConfirmOpen(true)}
          className="mt-2 flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400"
        >
          Apply {pct}%
        </button>
      )}
      {confirmOpen && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-300">Set rollout to {pct}%?</span>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-1 text-sm text-white hover:bg-sky-400 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Confirm'}
          </button>
          <button
            onClick={() => { setConfirmOpen(false); setPct(current ?? 0); setDirty(false) }}
            className="rounded-lg px-3 py-1 text-sm text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

function AuditLog({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-8 text-center">
        <p className="text-sm text-zinc-500">No audit entries yet.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50">
      <table className="w-full">
        <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Actor</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Action</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Reason</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-zinc-700/50 last:border-0 hover:bg-zinc-800/50">
              <td className="px-4 py-3 text-xs text-zinc-400">
                <span title={new Date(e.ts).toISOString()}>
                  {formatRelative(e.ts)}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-zinc-300">{e.actor}</td>
              <td className="px-4 py-3">
                <ActionBadge action={e.action} />
              </td>
              <td className="px-4 py-3 text-xs text-zinc-400">{e.reason ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    enable: 'text-emerald-400',
    create: 'text-sky-400',
    set: 'text-amber-400',
    disable: 'text-zinc-400',
    kill: 'text-red-400',
    delete: 'text-red-600',
  }
  return (
    <span className={`text-xs font-medium capitalize ${colors[action] ?? 'text-zinc-400'}`}>
      {action}
    </span>
  )
}

// ---- Main page --------------------------------------------------------------

export default function FlagDetailPage() {
  const params = useParams<{ key: string }>()
  const flagKey = params.key ? decodeURIComponent(params.key) : ''

  const [flag, setFlag] = useState<FeatureFlag | null>(null)
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [pluginDown, setPluginDown] = useState(false)
  const [permDenied, setPermDenied] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [savingRollout, setSavingRollout] = useState(false)
  const [killReason, setKillReason] = useState('')
  const [killOpen, setKillOpen] = useState(false)
  const [killing, setKilling] = useState(false)
  const [killError, setKillError] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [flagRes, histRes] = await Promise.all([
        fetch(`${FLAGS_API}/flags/${flagKey}`),
        fetch(`${FLAGS_API}/flags/${flagKey}/history`),
      ])
      if (flagRes.status === 401 || flagRes.status === 403) {
        setPermDenied(true)
        setLoading(false)
        return
      }
      if (!flagRes.ok) {
        setPluginDown(true)
        setLoading(false)
        return
      }
      setFlag(await flagRes.json())
      if (histRes.ok) {
        const data = await histRes.json()
        setAuditEntries(data.entries ?? [])
      }
      setPluginDown(false)
    } catch {
      setPluginDown(true)
    } finally {
      setLoading(false)
    }
  }, [flagKey])

  useEffect(() => { fetchData() }, [fetchData])

  const handleToggle = async () => {
    if (!flag) return
    setToggling(true)
    try {
      const action = flag.enabled ? 'disable' : 'enable'
      await fetch(`${FLAGS_API}/flags/${flag.key}/${action}`, { method: 'POST' })
      await fetchData()
    } finally {
      setToggling(false)
    }
  }

  const handleRollout = async (pct: number) => {
    if (!flag) return
    setSavingRollout(true)
    try {
      await fetch(`${FLAGS_API}/flags/${flag.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollout_pct: pct }),
      })
      await fetchData()
    } finally {
      setSavingRollout(false)
    }
  }

  const handleKill = async () => {
    if (!flag || !killReason.trim()) {
      setKillError('Reason is required.')
      return
    }
    setKilling(true)
    setKillError('')
    try {
      await fetch(`${FLAGS_API}/flags/${flag.key}/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: killReason }),
      })
      setKillOpen(false)
      setKillReason('')
      await fetchData()
    } finally {
      setKilling(false)
    }
  }

  // ---- States ----------------------------------------------------------------

  if (permDenied) {
    return (
      <div className="space-y-6">
        <Breadcrumb flagKey={flagKey} />
        <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-6">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <p className="font-medium text-red-300">Admin role required to view feature flag details.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!loading && pluginDown) {
    return (
      <div className="space-y-6">
        <Breadcrumb flagKey={flagKey} />
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <p className="font-medium text-yellow-300">feature-flags plugin is not running.</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading || !flag) {
    return (
      <div className="space-y-6">
        <Breadcrumb flagKey={flagKey} />
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 animate-pulse rounded-xl bg-zinc-800/50" />
          ))}
        </div>
      </div>
    )
  }

  const type = flag.type
  const typeMeta = type ? TYPE_META[type] : null

  return (
    <div className="space-y-6">
      <Breadcrumb flagKey={flag.key} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold text-white">{flag.key}</h1>
            {typeMeta && (
              <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${typeMeta.color}`}>
                {typeMeta.label}
              </span>
            )}
            {flag.enabled ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" /> Enabled
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <XCircle className="h-3.5 w-3.5" /> Disabled
              </span>
            )}
          </div>
          {flag.name && <p className="mt-1 text-sm text-zinc-400">{flag.name}</p>}
          {flag.description && <p className="mt-0.5 text-sm text-zinc-500">{flag.description}</p>}
        </div>

        {/* Toggle + Kill actions */}
        <div className="flex items-center gap-2">
          {flag.type !== 'kill_switch' && (
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                flag.enabled
                  ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              } disabled:opacity-50`}
            >
              {toggling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : flag.enabled ? (
                <PowerOff className="h-4 w-4" />
              ) : (
                <Power className="h-4 w-4" />
              )}
              {toggling ? 'Saving...' : flag.enabled ? 'Disable' : 'Enable'}
            </button>
          )}
          <button
            onClick={() => setKillOpen(!killOpen)}
            className="flex items-center gap-2 rounded-lg bg-red-900/40 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/60"
          >
            <Skull className="h-4 w-4" />
            Kill
          </button>
        </div>
      </div>

      {/* Kill form */}
      {killOpen && (
        <div className="rounded-xl border border-red-500/30 bg-red-900/10 p-4 space-y-3">
          <p className="text-sm font-medium text-red-300">
            Kill-switch this flag. This immediately sets enabled=false and broadcasts cache
            invalidation to all SDK consumers.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Reason (required)</label>
            <input
              type="text"
              value={killReason}
              onChange={(e) => { setKillReason(e.target.value); setKillError('') }}
              placeholder="e.g. CVE-2026-1234 mitigation"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
            />
            {killError && <p className="mt-1 text-xs text-red-400">{killError}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleKill}
              disabled={killing}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {killing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Skull className="h-4 w-4" />}
              {killing ? 'Killing...' : 'Confirm Kill'}
            </button>
            <button
              onClick={() => { setKillOpen(false); setKillReason(''); setKillError('') }}
              className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: details + rollout */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 space-y-2">
            <h2 className="text-sm font-medium text-white">Details</h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">ID</dt>
                <dd className="font-mono text-xs text-zinc-400">{flag.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Created</dt>
                <dd className="text-zinc-400">{formatRelative(flag.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Updated</dt>
                <dd className="text-zinc-400">{formatRelative(flag.updated_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Default value</dt>
                <dd className="font-mono text-xs text-zinc-400">
                  {JSON.stringify(flag.default_value)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Rollout slider */}
          <div>
            <h2 className="mb-2 text-sm font-medium text-white">Rollout</h2>
            <RolloutSlider
              current={flag.rollout_pct}
              onSave={handleRollout}
              saving={savingRollout}
            />
          </div>

          {/* Rules */}
          <div>
            <h2 className="mb-2 text-sm font-medium text-white">
              Rules ({Array.isArray(flag.rules) ? flag.rules.length : 0})
            </h2>
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
              {Array.isArray(flag.rules) && flag.rules.length > 0 ? (
                <pre className="overflow-auto text-xs text-zinc-300">
                  {JSON.stringify(flag.rules, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-zinc-500">No rules configured — uses default value.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column: audit log */}
        <div>
          <h2 className="mb-2 text-sm font-medium text-white">
            Audit Log ({auditEntries.length} entries)
          </h2>
          <AuditLog entries={auditEntries} />
        </div>
      </div>
    </div>
  )
}

function Breadcrumb({ flagKey }: { flagKey: string }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-zinc-500">
      <Link href="/flags" className="flex items-center gap-1 hover:text-zinc-300">
        <ArrowLeft className="h-4 w-4" />
        Feature Flags
      </Link>
      <ChevronRight className="h-3.5 w-3.5" />
      <span className="font-mono text-zinc-300">{flagKey}</span>
    </nav>
  )
}
