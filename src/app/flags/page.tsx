'use client'

import {
  AlertCircle,
  Flag,
  Loader2,
  Power,
  PowerOff,
  Shield,
  Skull,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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
  rules: unknown
  created_at: string
  updated_at: string
}

// ---- Constants --------------------------------------------------------------

const FLAGS_API = 'http://127.0.0.1:3305/v1'

const TYPE_META: Record<FlagType, { label: string; color: string }> = {
  release: {
    label: 'Release',
    color: 'text-sky-400 bg-sky-900/30 border-sky-700/50',
  },
  ops: {
    label: 'Ops',
    color: 'text-amber-400 bg-amber-900/30 border-amber-700/50',
  },
  experiment: {
    label: 'Experiment',
    color: 'text-violet-400 bg-violet-900/30 border-violet-700/50',
  },
  kill_switch: {
    label: 'Kill Switch',
    color: 'text-red-400 bg-red-900/30 border-red-700/50',
  },
}

// ---- Helpers ----------------------------------------------------------------

function TypeBadge({ type }: { type: FlagType | null }) {
  if (!type) return <span className="text-xs text-zinc-500">—</span>
  const meta = TYPE_META[type]
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${meta.color}`}
    >
      {meta.label}
    </span>
  )
}

function RolloutBar({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-zinc-500">—</span>
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-zinc-700">
        <div
          className="h-1.5 rounded-full bg-sky-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400">{pct}%</span>
    </div>
  )
}

// ---- Main page --------------------------------------------------------------

export default function FlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [pluginDown, setPluginDown] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<FlagType | ''>('')
  const [permDenied, setPermDenied] = useState(false)

  const fetchFlags = async () => {
    try {
      const url = typeFilter
        ? `${FLAGS_API}/flags?type=${typeFilter}`
        : `${FLAGS_API}/flags`
      const res = await fetch(url)
      if (res.status === 401 || res.status === 403) {
        setPermDenied(true)
        setLoading(false)
        return
      }
      if (res.status === 429) {
        setRateLimited(true)
        setLoading(false)
        return
      }
      if (!res.ok) {
        setPluginDown(true)
        setLoading(false)
        return
      }
      const data = await res.json()
      setFlags(data.flags ?? [])
      setPluginDown(false)
      setRateLimited(false)
      setPermDenied(false)
    } catch {
      setPluginDown(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlags()
  }, [typeFilter])

  const handleToggle = async (flag: FeatureFlag) => {
    setToggling(flag.key)
    try {
      const action = flag.enabled ? 'disable' : 'enable'
      await fetch(`${FLAGS_API}/flags/${flag.key}/${action}`, {
        method: 'POST',
      })
      await fetchFlags()
    } finally {
      setToggling(null)
    }
  }

  // ---- States ----------------------------------------------------------------

  if (permDenied) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-6">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-red-300">Permission denied</p>
              <p className="mt-1 text-sm text-red-400/80">
                Admin role required to manage feature flags.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!loading && pluginDown) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">
                feature-flags plugin is not running
              </p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Install and start the plugin to manage feature flags.
              </p>
              <pre className="mt-3 rounded-lg bg-zinc-900/80 px-4 py-3 font-mono text-sm text-zinc-300">
                nself plugin install feature-flags
              </pre>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (rateLimited) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="rounded-xl border border-orange-500/30 bg-orange-900/20 p-6">
          <p className="font-medium text-orange-300">
            Rate limited — please wait a moment.
          </p>
        </div>
      </div>
    )
  }

  const filtered = typeFilter
    ? flags.filter((f) => f.type === typeFilter)
    : flags

  return (
    <div className="space-y-6">
      <Header />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">Filter:</span>
        {(['', 'release', 'ops', 'experiment', 'kill_switch'] as const).map(
          (t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-sky-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {t === '' ? 'All' : TYPE_META[t].label}
            </button>
          ),
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-14 animate-pulse rounded-xl bg-zinc-800/50"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !pluginDown && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <Flag className="mb-4 h-12 w-12 text-zinc-600" />
          <p className="text-sm text-zinc-400">No feature flags found.</p>
          <p className="mt-1 text-xs text-zinc-500">
            Create flags via the REST API or nself CLI:{' '}
            <code className="font-mono">nself flag</code>
          </p>
        </div>
      )}

      {/* Flags table */}
      {!loading && filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50">
          <table className="w-full">
            <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Rollout
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Enabled
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((flag) => (
                <tr
                  key={flag.id}
                  className="border-b border-zinc-700/50 last:border-0 hover:bg-zinc-800/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/flags/${flag.key}`}
                      className="font-mono text-sm text-sky-400 hover:text-sky-300 hover:underline"
                    >
                      {flag.key}
                    </Link>
                    {flag.name && (
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {flag.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={flag.type} />
                  </td>
                  <td className="px-4 py-3">
                    <RolloutBar pct={flag.rollout_pct} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        flag.enabled ? 'text-emerald-400' : 'text-zinc-500'
                      }`}
                    >
                      {flag.enabled ? (
                        <Power className="h-3.5 w-3.5" />
                      ) : (
                        <PowerOff className="h-3.5 w-3.5" />
                      )}
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {/* Toggle button */}
                      <button
                        onClick={() => handleToggle(flag)}
                        disabled={
                          toggling === flag.key || flag.type === 'kill_switch'
                        }
                        title={
                          flag.type === 'kill_switch'
                            ? 'Kill switches cannot be toggled from UI — use nself flag kill'
                            : flag.enabled
                              ? 'Disable'
                              : 'Enable'
                        }
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {toggling === flag.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : flag.enabled ? (
                          <ToggleRight className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </button>
                      {/* Detail link */}
                      <Link
                        href={`/flags/${flag.key}`}
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700/50 hover:text-white"
                        title="View details"
                      >
                        <Skull className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Feature Flags</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Manage feature flags via the nself feature-flags plugin. Toggle flags,
        adjust rollout percentages, and review audit logs.
      </p>
    </div>
  )
}
