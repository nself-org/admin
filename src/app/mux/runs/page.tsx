'use client'

import {
  AlertCircle,
  CheckCircle,
  Link,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const MUX_API = 'http://127.0.0.1:3711'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MuxRun {
  id: string
  message_id: string
  gmail_address?: string
  rule_id?: string
  rule_name: string
  handler: string
  result: 'ok' | 'shadow' | 'error' | 'skipped' | string
  duration_ms?: number
  error_msg?: string
  shadow_mode: boolean
  created_at: string
}

interface MuxRule {
  id: string
  name: string
  conditions: {
    from?: string
    subject_contains?: string
    body_contains?: string
  }
  action: Record<string, unknown>
}

// ── Routing map ───────────────────────────────────────────────────────────────

function RoutingMap({ rules }: { rules: MuxRule[] }) {
  const forwardRules = rules.filter(
    (r) =>
      r.action &&
      (Object.keys(r.action)[0] === 'forward_to' ||
        Object.keys(r.action)[0] === 'forward_action'),
  )

  if (forwardRules.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-6">
        <p className="mb-1 text-sm font-medium text-white">Routing Map</p>
        <p className="text-sm text-zinc-500">
          No forwarding rules configured. Routing map shows rules with{' '}
          <span className="font-mono text-xs text-zinc-400">forward_to</span> or{' '}
          <span className="font-mono text-xs text-zinc-400">
            forward_action
          </span>{' '}
          actions.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30">
      <div className="border-b border-zinc-700/50 px-5 py-4">
        <p className="text-sm font-medium text-white">Routing Map</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Sender patterns and their forwarding destinations
        </p>
      </div>
      <div className="overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Rule
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Sender pattern
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Subject filter
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Destination
              </th>
            </tr>
          </thead>
          <tbody>
            {forwardRules.map((rule) => {
              const actionType = Object.keys(rule.action)[0] as string
              const actionCfg = rule.action[actionType] as Record<
                string,
                unknown
              >
              const dest =
                actionType === 'forward_to'
                  ? (actionCfg?.url as string)
                  : (actionCfg?.to as string)

              return (
                <tr
                  key={rule.id}
                  className="border-b border-zinc-700/50 last:border-0"
                >
                  <td className="px-4 py-3 text-sm font-medium text-white">
                    {rule.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-zinc-400">
                    {rule.conditions.from ?? (
                      <span className="text-zinc-600 italic">any sender</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-zinc-400">
                    {rule.conditions.subject_contains ?? (
                      <span className="text-zinc-600 italic">any subject</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                      <span className="max-w-[240px] truncate font-mono text-sm text-sky-300">
                        {dest ?? '—'}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Result badge ──────────────────────────────────────────────────────────────

function ResultBadge({ result, shadow }: { result: string; shadow: boolean }) {
  if (shadow) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-yellow-900/30 px-2 py-0.5 text-xs text-yellow-300">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
        shadow
      </span>
    )
  }
  switch (result) {
    case 'ok':
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-400">
          <CheckCircle className="h-3.5 w-3.5" />
          ok
        </span>
      )
    case 'error':
      return (
        <span className="flex items-center gap-1 text-xs text-red-400">
          <XCircle className="h-3.5 w-3.5" />
          error
        </span>
      )
    case 'skipped':
      return <span className="text-xs text-zinc-500">skipped</span>
    default:
      return <span className="text-xs text-zinc-400">{result}</span>
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MuxRunsPage() {
  const [runs, setRuns] = useState<MuxRun[]>([])
  const [rules, setRules] = useState<MuxRule[]>([])
  const [loading, setLoading] = useState(true)
  const [muxDown, setMuxDown] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = async () => {
    try {
      const [runsRes, rulesRes] = await Promise.all([
        fetch(`${MUX_API}/mux/runs`),
        fetch(`${MUX_API}/mux/rules`),
      ])
      if (!runsRes.ok) {
        setMuxDown(true)
        return
      }
      const runsData = (await runsRes.json()) as { runs: MuxRun[] }
      const rulesData = rulesRes.ok
        ? ((await rulesRes.json()) as { rules: MuxRule[] })
        : { rules: [] }

      setRuns(runsData.runs ?? [])
      setRules(rulesData.rules ?? [])
      setMuxDown(false)
    } catch (_err) {
      setMuxDown(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAll()
  }

  if (!loading && muxDown) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Mux Runs</h1>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">
                nself-mux is not running
              </p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Start the mux plugin to view run history.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Summary stats
  const totalRuns = runs.length
  const okRuns = runs.filter((r) => r.result === 'ok').length
  const errorRuns = runs.filter((r) => r.result === 'error').length
  const shadowRuns = runs.filter((r) => r.shadow_mode).length
  const avgDuration =
    runs.length > 0
      ? Math.round(
          runs
            .filter((r) => r.duration_ms != null)
            .reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) /
            Math.max(runs.filter((r) => r.duration_ms != null).length, 1),
        )
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Mux Runs</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Recent rule executions and routing map
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Stats */}
      {!loading && !muxDown && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total runs', value: totalRuns, color: 'text-white' },
            { label: 'Successful', value: okRuns, color: 'text-emerald-400' },
            { label: 'Errors', value: errorRuns, color: 'text-red-400' },
            { label: 'Shadow', value: shadowRuns, color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4"
            >
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Routing map */}
      {!loading && !muxDown && <RoutingMap rules={rules} />}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-12 animate-pulse rounded-xl bg-zinc-800/50"
            />
          ))}
        </div>
      )}

      {/* Recent runs table */}
      {!loading && !muxDown && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50">
          <div className="flex items-center justify-between border-b border-zinc-700/50 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-white">Recent Runs</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Last {runs.length} rule executions
                {avgDuration > 0 && ` · avg ${avgDuration}ms`}
              </p>
            </div>
          </div>

          {runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="mb-3 h-8 w-8 text-zinc-600" />
              <p className="text-sm text-zinc-500">No runs yet</p>
              <p className="mt-1 text-xs text-zinc-600">
                Rule executions will appear here once messages are processed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Account
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Rule
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Handler
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Result
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      className="border-b border-zinc-700/50 last:border-0 hover:bg-zinc-800/50"
                    >
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-zinc-400">
                        {new Date(run.created_at).toLocaleString()}
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-xs text-zinc-400">
                        {run.gmail_address ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-200">
                        {run.rule_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 font-mono text-xs text-zinc-300">
                          {run.handler}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <ResultBadge
                            result={run.result}
                            shadow={run.shadow_mode}
                          />
                          {run.error_msg && (
                            <p className="max-w-[200px] truncate text-xs text-red-400/80">
                              {run.error_msg}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-500">
                        {run.duration_ms != null ? `${run.duration_ms}ms` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
