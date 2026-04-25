'use client'

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  TrendingDown,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const AI_API = 'http://127.0.0.1:8010'
const INTERNAL_TOKEN = process.env.NEXT_PUBLIC_PLUGIN_INTERNAL_SECRET ?? ''

// ── Types ──────────────────────────────────────────────────────────────────────

interface Recommendation {
  task_class: string
  current_model: string
  suggested_model: string
  request_count: number
  current_cost_usd: number
  projected_cost_usd: number
  savings_usd: number
  savings_pct: number
  quality_risk: 'low' | 'medium' | 'high'
  confidence: number
  period_days: number
}

interface RoutingRule {
  id: string
  task_class: string
  model: string
  confidence_min: number
  enabled: boolean
  applied_at: string
  monthly_savings_est: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtCost(n: number): string {
  if (n < 0.01) return `$${(n * 100).toFixed(2)}¢`
  return `$${n.toFixed(2)}`
}

function fmtPct(n: number): string {
  return `${n.toFixed(0)}%`
}

function _riskColor(risk: string): string {
  if (risk === 'low') return 'text-green-400'
  if (risk === 'medium') return 'text-yellow-400'
  return 'text-red-400'
}

function riskBadge(risk: string): string {
  if (risk === 'low')
    return 'rounded-full bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-400 border border-green-500/30'
  if (risk === 'medium')
    return 'rounded-full bg-yellow-900/30 px-2 py-0.5 text-xs font-medium text-yellow-400 border border-yellow-500/30'
  return 'rounded-full bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-400 border border-red-500/30'
}

// ── Optimization score ring ─────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 40
  const circ = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg
        className="absolute inset-0"
        viewBox="0 0 100 100"
        width={112}
        height={112}
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="text-center">
        <div className="text-2xl font-bold text-white">{score}</div>
        <div className="text-xs text-zinc-400">/ 100</div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AICostDashboardPage() {
  const [score, setScore] = useState<number | null>(null)
  const [totalSavings, setTotalSavings] = useState<number | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [rules, setRules] = useState<RoutingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [disabling, setDisabling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const headers = {
    'Content-Type': 'application/json',
    'X-Internal-Token': INTERNAL_TOKEN,
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [scoreRes, savingsRes, recsRes, rulesRes] = await Promise.all([
        fetch(`${AI_API}/ai/cost/score`, { headers }),
        fetch(`${AI_API}/ai/cost/savings`, { headers }),
        fetch(`${AI_API}/ai/cost/report?days=30`, { headers }),
        fetch(`${AI_API}/ai/cost/rules`, { headers }),
      ])

      if (scoreRes.ok) {
        const d = await scoreRes.json()
        setScore(d.optimization_score ?? 0)
      }
      if (savingsRes.ok) {
        const d = await savingsRes.json()
        setTotalSavings(d.projected_monthly_savings_usd ?? 0)
      }
      if (recsRes.ok) {
        const d = await recsRes.json()
        setRecommendations(d.recommendations ?? [])
      }
      if (rulesRes.ok) {
        const d = await rulesRes.json()
        setRules(Array.isArray(d) ? d : [])
      }
    } catch (e) {
      setError(`Failed to load: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  async function runAnalysis() {
    setAnalyzing(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch(`${AI_API}/ai/cost/analyze?days=30`, {
        method: 'POST',
        headers,
      })
      if (!res.ok) throw new Error(await res.text())
      const d = await res.json()
      setSuccessMsg(
        `Analysis complete — ${d.recommendations_count ?? 0} recommendations updated.`,
      )
      await fetchAll()
    } catch (e) {
      setError(`Analysis failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAnalyzing(false)
    }
  }

  async function applyRule(rec: Recommendation) {
    const key = rec.task_class + rec.current_model
    setApplying(key)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch(`${AI_API}/ai/cost/rules`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rec),
      })
      if (!res.ok) throw new Error(await res.text())
      setSuccessMsg(
        `Rule applied for "${rec.task_class}" — requests now route to ${rec.suggested_model}.`,
      )
      await fetchAll()
    } catch (e) {
      setError(`Apply failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setApplying(null)
    }
  }

  async function disableRule(id: string) {
    setDisabling(id)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch(`${AI_API}/ai/cost/rules/${id}/disable`, {
        method: 'POST',
        headers,
      })
      if (!res.ok) throw new Error(await res.text())
      setSuccessMsg('Rule disabled.')
      await fetchAll()
    } catch (e) {
      setError(`Disable failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setDisabling(null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            AI Cost Optimization
          </h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Route tasks to cheaper models without quality loss.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void runAnalysis()}
            disabled={analyzing}
            className="flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-900/20 px-3 py-1.5 text-sm text-sky-400 hover:bg-sky-900/40 disabled:opacity-50"
          >
            {analyzing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            {analyzing ? 'Analyzing…' : 'Re-analyze'}
          </button>
          <button
            onClick={() => void fetchAll()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-900/20 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Optimization score */}
            <div className="flex items-center gap-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <ScoreRing score={score ?? 0} />
              <div>
                <div className="text-sm text-zinc-400">Optimization Score</div>
                <div className="mt-1 text-xs text-zinc-500">
                  % of savings captured
                </div>
              </div>
            </div>

            {/* Projected savings */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="text-sm text-zinc-400">
                Projected Monthly Savings
              </div>
              <div className="mt-2 text-3xl font-bold text-green-400">
                {totalSavings != null ? fmtCost(totalSavings) : '—'}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                if all recommendations applied
              </div>
            </div>

            {/* Active rules */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="text-sm text-zinc-400">Active Routing Rules</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {rules.length}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                overriding model selection
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-medium text-zinc-300">
              Recommendations{' '}
              <span className="text-zinc-500">({recommendations.length})</span>
            </h2>
            {recommendations.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 py-10 text-center text-sm text-zinc-500">
                No recommendations yet. Click Re-analyze to scan recent
                requests.
              </div>
            ) : (
              <div className="space-y-2">
                {recommendations.slice(0, 5).map((rec) => {
                  const key = rec.task_class + rec.current_model
                  const isApplying = applying === key
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium text-white capitalize">
                              {rec.task_class.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {rec.request_count.toLocaleString()} req/mo
                            </span>
                            <span className={riskBadge(rec.quality_risk)}>
                              {rec.quality_risk} risk
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-400">
                            <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-300">
                              {rec.current_model}
                            </span>
                            <ChevronRight className="h-3 w-3 text-zinc-600" />
                            <span className="rounded bg-sky-900/40 px-1.5 py-0.5 font-mono text-sky-300">
                              {rec.suggested_model}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="flex items-center gap-1 font-medium text-green-400">
                            <TrendingDown className="h-3.5 w-3.5" />
                            {fmtCost(rec.savings_usd)}/mo
                            <span className="text-xs text-green-500/70">
                              ({fmtPct(rec.savings_pct)} savings)
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-500">
                            {fmtCost(rec.current_cost_usd)} →{' '}
                            {fmtCost(rec.projected_cost_usd)}
                          </div>
                          <button
                            onClick={() => void applyRule(rec)}
                            disabled={isApplying}
                            className="mt-2 flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-900/20 px-2.5 py-1 text-xs text-sky-400 hover:bg-sky-900/40 disabled:opacity-50"
                          >
                            {isApplying ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Zap className="h-3 w-3" />
                            )}
                            Apply rule
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Active routing rules */}
          {rules.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-zinc-300">
                Active Routing Rules
              </h2>
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                      <th className="px-4 py-2.5 font-medium">Task class</th>
                      <th className="px-4 py-2.5 font-medium">Routes to</th>
                      <th className="px-4 py-2.5 font-medium">
                        Min confidence
                      </th>
                      <th className="px-4 py-2.5 font-medium">Applied</th>
                      <th className="px-4 py-2.5 font-medium">
                        Est. savings/mo
                      </th>
                      <th className="px-4 py-2.5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {rules.map((rule) => (
                      <tr
                        key={rule.id}
                        className="text-zinc-300 hover:bg-zinc-900/40"
                      >
                        <td className="px-4 py-2.5 capitalize">
                          {rule.task_class.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-sky-300">
                          {rule.model}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400">
                          {(rule.confidence_min * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-2.5 text-xs text-zinc-500">
                          {new Date(rule.applied_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2.5 text-green-400">
                          {fmtCost(rule.monthly_savings_est)}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => void disableRule(rule.id)}
                            disabled={disabling === rule.id}
                            className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-400 hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                          >
                            {disabling === rule.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Disable'
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
