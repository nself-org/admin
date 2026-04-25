'use client'

import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const CLAW_API = 'http://127.0.0.1:3710'

// ── Types ──────────────────────────────────────────────────────────────────────

type PluginStatus = 'checking' | 'running' | 'stopped'

interface BiosLayer {
  level: number
  name: string
  description: string
  active: boolean
  prompt_hash: string
  token_count: number
  last_modified: string
}

interface BiosStatus {
  level: number
  prompt_hash: string
  last_snapshot: string
  drift_count: number
  healthy: boolean
  layers: BiosLayer[]
  total_tokens: number
  heal_available: boolean
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

// ── Layer icons ────────────────────────────────────────────────────────────────

const LAYER_ICONS: Record<number, React.ElementType> = {
  1: Shield,
  2: Sparkles,
  3: Zap,
  4: Wrench,
  5: CheckCircle2,
}

function LayerIcon({ level }: { level: number }) {
  const Icon = LAYER_ICONS[level] ?? Shield
  return <Icon className="h-4 w-4" />
}

// ── Layer row ─────────────────────────────────────────────────────────────────

function LayerRow({ layer }: { layer: BiosLayer }) {
  return (
    <div
      className={`flex items-start gap-4 rounded-xl border p-4 ${
        layer.active
          ? 'border-sky-500/20 bg-sky-900/10'
          : 'border-zinc-800 bg-zinc-900/40'
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
          layer.active
            ? 'border-sky-500/30 bg-sky-900/20 text-sky-400'
            : 'border-zinc-700 bg-zinc-800 text-zinc-500'
        }`}
      >
        <LayerIcon level={layer.level} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">
            L{layer.level} — {layer.name}
          </span>
          {layer.active && (
            <span className="rounded-full border border-sky-500/30 bg-sky-900/20 px-1.5 py-0.5 text-xs text-sky-400">
              Active
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">{layer.description}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
          <span>
            Hash:{' '}
            <code className="font-mono text-zinc-400">
              {layer.prompt_hash.slice(0, 8)}&hellip;
            </code>
          </span>
          <span>{layer.token_count.toLocaleString()} tokens</span>
          <span>Modified {timeAgo(layer.last_modified)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BiosPage() {
  const [pluginStatus, setPluginStatus] = useState<PluginStatus>('checking')
  const [refreshing, setRefreshing] = useState(false)
  const [bios, setBios] = useState<BiosStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [healing, setHealing] = useState(false)
  const [snapshotting, setSnapshotting] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

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

  const fetchBios = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${CLAW_API}/claw/bios/status`, {
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) return
      const data = (await res.json()) as BiosStatus
      setBios(data)
    } catch {
      // plugin down or bios not available
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    await checkHealth(true)
    await fetchBios()
  }, [checkHealth, fetchBios])

  useEffect(() => {
    void checkHealth()
    void fetchBios()
  }, [checkHealth, fetchBios])

  const handleHeal = useCallback(async () => {
    setHealing(true)
    setActionMsg(null)
    try {
      const res = await fetch(`${CLAW_API}/claw/bios/heal`, {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
      })
      if (res.ok) {
        setActionMsg('Heal complete')
        await fetchBios()
      } else {
        setActionMsg('Heal failed')
      }
    } catch {
      setActionMsg('Heal failed — plugin unreachable')
    } finally {
      setHealing(false)
    }
  }, [fetchBios])

  const handleSnapshot = useCallback(async () => {
    setSnapshotting(true)
    setActionMsg(null)
    try {
      const res = await fetch(`${CLAW_API}/claw/bios/snapshot`, {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
      })
      if (res.ok) {
        setActionMsg('Snapshot saved')
        await fetchBios()
      } else {
        setActionMsg('Snapshot failed')
      }
    } catch {
      setActionMsg('Snapshot failed — plugin unreachable')
    } finally {
      setSnapshotting(false)
    }
  }, [fetchBios])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">BIOS</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Behavioral Identity Operating System — layered prompt stack
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

      {/* Action message */}
      {actionMsg && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-sm ${
            actionMsg.includes('failed')
              ? 'border-red-500/30 bg-red-900/10 text-red-400'
              : 'border-green-500/30 bg-green-900/10 text-green-400'
          }`}
        >
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : !bios ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 py-16">
          <Shield className="h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">BIOS status unavailable</p>
          <p className="text-xs text-zinc-600">
            Requires claw plugin v1.1.1+ with C17 BIOS enabled
          </p>
        </div>
      ) : (
        <>
          {/* Status summary card */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-xs text-zinc-500">Health</p>
              <p
                className={`mt-1 text-sm font-semibold ${bios.healthy ? 'text-green-400' : 'text-amber-400'}`}
              >
                {bios.healthy ? 'Healthy' : 'Drift detected'}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-xs text-zinc-500">Prompt hash</p>
              <p className="mt-1 font-mono text-sm text-zinc-300">
                {bios.prompt_hash.slice(0, 8)}&hellip;
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-xs text-zinc-500">Last snapshot</p>
              <p className="mt-1 text-sm text-zinc-300">
                {timeAgo(bios.last_snapshot)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-xs text-zinc-500">Drift count</p>
              <p
                className={`mt-1 text-sm font-semibold ${bios.drift_count > 0 ? 'text-amber-400' : 'text-zinc-300'}`}
              >
                {bios.drift_count}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void handleSnapshot()}
              disabled={snapshotting || pluginStatus !== 'running'}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-700 disabled:opacity-50"
            >
              {snapshotting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              Save snapshot
            </button>
            {bios.heal_available && !bios.healthy && (
              <button
                onClick={() => void handleHeal()}
                disabled={healing || pluginStatus !== 'running'}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-900/10 px-3 py-2 text-sm font-medium text-amber-300 transition-colors hover:border-amber-500/50 hover:bg-amber-900/20 disabled:opacity-50"
              >
                {healing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wrench className="h-4 w-4" />
                )}
                Heal drift
              </button>
            )}
          </div>

          {/* Layer list */}
          {bios.layers && bios.layers.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400">
                Prompt layers ({bios.layers.length})
              </h2>
              {bios.layers.map((layer) => (
                <LayerRow key={layer.level} layer={layer} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-700 py-8 text-center">
              <p className="text-sm text-zinc-500">No layer detail available</p>
            </div>
          )}

          {/* Token summary */}
          {bios.total_tokens > 0 && (
            <p className="text-right text-xs text-zinc-600">
              Total BIOS tokens: {bios.total_tokens.toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  )
}
