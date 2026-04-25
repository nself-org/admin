'use client'

import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Globe,
  Loader2,
  MessageSquare,
  RefreshCw,
  Tag,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

const CLAW_API = 'http://127.0.0.1:3710'

// ── Types ──────────────────────────────────────────────────────────────────────

type PluginStatus = 'checking' | 'running' | 'stopped'

interface ClawStats {
  conversation_count: number
  topic_count: number
  entity_count: number
  memory_count: number
  session_count: number
}

interface BiosStatus {
  level: number
  prompt_hash: string
  last_snapshot: string
  drift_count: number
  healthy: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
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
      Stopped
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:border-sky-500/30 hover:bg-zinc-900"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800">
        <Icon className="h-5 w-5 text-sky-400" />
      </div>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-xl font-semibold text-zinc-100 tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>
    </Link>
  )
}

// ── BIOS summary widget ───────────────────────────────────────────────────────

function BiosSummary({ bios }: { bios: BiosStatus | null }) {
  if (!bios) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="text-xs text-zinc-500">BIOS status unavailable</p>
      </div>
    )
  }

  const levelLabels: Record<number, string> = {
    1: 'L1 — Core Identity',
    2: 'L2 — Behavioral Defaults',
    3: 'L3 — Context Rules',
    4: 'L4 — Tool Permissions',
    5: 'L5 — User Overrides',
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">BIOS</span>
        {bios.healthy ? (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            Healthy
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <AlertCircle className="h-3 w-3" />
            Drift detected
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-zinc-500">Active level</dt>
          <dd className="text-zinc-300">
            {levelLabels[bios.level] ?? `L${bios.level}`}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Drift count</dt>
          <dd
            className={
              bios.drift_count > 0 ? 'text-amber-400' : 'text-zinc-300'
            }
          >
            {bios.drift_count}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Prompt hash</dt>
          <dd className="font-mono text-zinc-400">
            {bios.prompt_hash.slice(0, 8)}&hellip;
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Last snapshot</dt>
          <dd className="text-zinc-300">{timeAgo(bios.last_snapshot)}</dd>
        </div>
      </dl>
      <Link
        href="/claw/bios"
        className="block text-right text-xs text-sky-400 hover:text-sky-300"
      >
        View details
      </Link>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClawDashboardPage() {
  const [pluginStatus, setPluginStatus] = useState<PluginStatus>('checking')
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<ClawStats | null>(null)
  const [bios, setBios] = useState<BiosStatus | null>(null)

  const checkHealth = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    try {
      const res = await fetch(`${CLAW_API}/health`, {
        signal: AbortSignal.timeout(4_000),
      })
      setPluginStatus(res.ok ? 'running' : 'stopped')
    } catch {
      setPluginStatus('stopped')
    } finally {
      if (showRefreshing) setRefreshing(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${CLAW_API}/claw/stats`, {
        signal: AbortSignal.timeout(4_000),
      })
      if (!res.ok) return
      const data = (await res.json()) as ClawStats
      setStats(data)
    } catch {
      // plugin down — handled by status badge
    }
  }, [])

  const fetchBios = useCallback(async () => {
    try {
      const res = await fetch(`${CLAW_API}/claw/bios/status`, {
        signal: AbortSignal.timeout(4_000),
      })
      if (!res.ok) return
      const data = (await res.json()) as BiosStatus
      setBios(data)
    } catch {
      // bios unavailable
    }
  }, [])

  const refresh = useCallback(async () => {
    await checkHealth(true)
    await fetchStats()
    await fetchBios()
  }, [checkHealth, fetchStats, fetchBios])

  useEffect(() => {
    void checkHealth()
    void fetchStats()
    void fetchBios()
  }, [checkHealth, fetchStats, fetchBios])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">ɳClaw</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            AI assistant data management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={pluginStatus} />
          <button
            onClick={() => void refresh()}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Plugin offline warning */}
      {pluginStatus === 'stopped' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-900/10 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              claw plugin is not running
            </p>
            <p className="mt-0.5 text-xs text-amber-400/70">
              Install via:{' '}
              <code className="rounded bg-amber-900/30 px-1 font-mono">
                nself plugin install claw
              </code>
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={MessageSquare}
          label="Conversations"
          value={stats?.conversation_count ?? '—'}
          href="/claw/conversations"
        />
        <StatCard
          icon={Tag}
          label="Topics"
          value={stats?.topic_count ?? '—'}
          href="/claw/topics"
        />
        <StatCard
          icon={Globe}
          label="Entities"
          value={stats?.entity_count ?? '—'}
          href="/claw/entities"
        />
        <StatCard
          icon={Brain}
          label="Memories"
          value={stats?.memory_count ?? '—'}
          href="/claw/memory"
        />
        <StatCard
          icon={Brain}
          label="Sessions"
          value={stats?.session_count ?? '—'}
          href="/claw/sessions"
        />
      </div>

      {/* BIOS summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">
            BIOS Status
          </h2>
          <BiosSummary bios={bios} />
        </div>

        {/* Quick nav */}
        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">
            Quick access
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/claw/conversations', label: 'Conversations' },
              { href: '/claw/topics', label: 'Topics' },
              { href: '/claw/entities', label: 'Entities' },
              { href: '/claw/memory', label: 'Memory' },
              { href: '/claw/sessions', label: 'Sessions' },
              { href: '/claw/bios', label: 'BIOS' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:border-sky-500/30 hover:text-zinc-100"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
