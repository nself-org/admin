'use client'

import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit2,
  GripVertical,
  Loader2,
  Save,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const AI_API = 'http://127.0.0.1:8010'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoutingTask {
  task_class: string
  tier_chain: string[]
  background_only_local: boolean
  timeout_ms: number
  notes: string
}

interface QualityMetric {
  task_class: string
  tier_distribution: Record<string, number>
  latency_p95_ms: Record<string, number>
  quality_trend: number[]
  cost_per_day_usd: number
}

type PageState = 'loading' | 'ready' | 'error'

const ALL_TIERS = ['local', 'gemini_free', 'gemini_paid', 'openai', 'anthropic', 'fallback'] as const

const TIER_LABELS: Record<string, string> = {
  local: 'Local (Ollama)',
  gemini_free: 'Gemini Free',
  gemini_paid: 'Gemini Paid',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  fallback: 'Fallback',
}

const TIER_COLORS: Record<string, string> = {
  local: 'bg-green-500/20 text-green-300 border-green-500/30',
  gemini_free: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  gemini_paid: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  openai: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  anthropic: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  fallback: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RoutingPage() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [error, setError] = useState('')
  const [tasks, setTasks] = useState<RoutingTask[]>([])
  const [quality, setQuality] = useState<QualityMetric[]>([])
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<RoutingTask | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const fetchAll = useCallback(async () => {
    setPageState('loading')
    setError('')
    try {
      const [tRes, qRes] = await Promise.all([
        fetch(`${AI_API}/ai/routing/tasks`),
        fetch(`${AI_API}/ai/routing/quality`),
      ])
      if (!tRes.ok) throw new Error(`HTTP ${tRes.status}`)
      setTasks((await tRes.json()).tasks ?? [])
      if (qRes.ok) setQuality((await qRes.json()).metrics ?? [])
      setPageState('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load routing config.')
      setPageState('error')
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function startEdit(task: RoutingTask) {
    setEditingTask(task.task_class)
    setEditForm({ ...task, tier_chain: [...task.tier_chain] })
  }

  function cancelEdit() {
    setEditingTask(null)
    setEditForm(null)
  }

  function moveTier(index: number, direction: -1 | 1) {
    if (!editForm) return
    const chain = [...editForm.tier_chain]
    const target = index + direction
    if (target < 0 || target >= chain.length) return
    ;[chain[index], chain[target]] = [chain[target], chain[index]]
    setEditForm({ ...editForm, tier_chain: chain })
  }

  function removeTier(index: number) {
    if (!editForm) return
    setEditForm({ ...editForm, tier_chain: editForm.tier_chain.filter((_, i) => i !== index) })
  }

  function addTier(tier: string) {
    if (!editForm || editForm.tier_chain.includes(tier)) return
    setEditForm({ ...editForm, tier_chain: [...editForm.tier_chain, tier] })
  }

  async function saveTask() {
    if (!editForm || !editingTask) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${AI_API}/ai/routing/tasks/${editingTask}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier_chain: editForm.tier_chain,
          background_only_local: editForm.background_only_local,
          timeout_ms: editForm.timeout_ms,
          notes: editForm.notes,
        }),
      })
      if (!res.ok) {
        if (res.status === 422) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.message ?? 'Invalid tier configuration.')
        }
        throw new Error(`HTTP ${res.status}`)
      }
      setSaved(editingTask)
      setTimeout(() => setSaved(null), 2000)
      cancelEdit()
      await fetchAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    }
    setSaving(false)
  }

  // ── Loading / Error States ────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-100">AI Routing</h1>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-12 animate-pulse rounded-xl bg-zinc-800/50" />
          ))}
        </div>
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-100">AI Routing</h1>
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

  // ── Ready State ───────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-zinc-100">AI Routing</h1>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── Routing Table ─────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700/50 text-left text-xs text-zinc-500">
              <th className="px-5 py-3">Task Class</th>
              <th className="px-5 py-3">Tier Chain</th>
              <th className="px-5 py-3">BG-Local</th>
              <th className="px-5 py-3">Timeout</th>
              <th className="px-5 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.task_class} className={`border-b border-zinc-800/50 ${saved === t.task_class ? 'bg-green-500/5' : ''}`}>
                <td className="px-5 py-3 font-medium text-zinc-200">{t.task_class}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {t.tier_chain.map((tier, i) => (
                      <span key={i} className={`rounded border px-1.5 py-0.5 text-xs ${TIER_COLORS[tier] ?? 'bg-zinc-700/20 text-zinc-400 border-zinc-700/30'}`}>
                        {i + 1}. {TIER_LABELS[tier] ?? tier}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-zinc-400">{t.background_only_local ? 'Yes' : 'No'}</td>
                <td className="px-5 py-3 text-zinc-400">{(t.timeout_ms / 1000).toFixed(0)}s</td>
                <td className="px-5 py-3">
                  <button onClick={() => startEdit(t)} className="rounded p-1 text-zinc-500 hover:bg-zinc-700/50 hover:text-zinc-300">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      {editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-zinc-100">
                Edit: <span className="text-sky-400">{editForm.task_class}</span>
              </h3>
              <button onClick={cancelEdit} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tier chain */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-zinc-400">Tier Chain (drag to reorder)</label>
              <div className="space-y-1">
                {editForm.tier_chain.map((tier, i) => (
                  <div key={tier} className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2">
                    <GripVertical className="h-3.5 w-3.5 text-zinc-600" />
                    <span className="flex-1 text-sm text-zinc-200">{i + 1}. {TIER_LABELS[tier] ?? tier}</span>
                    <button onClick={() => moveTier(i, -1)} disabled={i === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveTier(i, 1)} disabled={i === editForm.tier_chain.length - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeTier(i)} className="text-red-500/50 hover:text-red-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {ALL_TIERS.filter((t) => !editForm.tier_chain.includes(t)).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => addTier(tier)}
                    className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-500 hover:border-sky-500/30 hover:text-sky-300"
                  >
                    + {TIER_LABELS[tier] ?? tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="mb-4 space-y-3">
              <label className="flex items-center gap-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={editForm.background_only_local}
                  onChange={(e) => setEditForm({ ...editForm, background_only_local: e.target.checked })}
                  className="h-4 w-4"
                />
                Background-only local
              </label>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Timeout (seconds)</label>
                <input
                  type="number"
                  value={editForm.timeout_ms / 1000}
                  onChange={(e) => setEditForm({ ...editForm, timeout_ms: Number(e.target.value) * 1000 })}
                  min={1}
                  max={300}
                  className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 resize-y"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={cancelEdit} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
              <button onClick={saveTask} disabled={saving} className="rounded-lg bg-sky-500 px-4 py-2 text-sm text-white hover:bg-sky-400 disabled:opacity-50">
                {saving ? <Loader2 className="inline h-4 w-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quality Dashboard ─────────────────────────────────────────────── */}
      {quality.length > 0 && (
        <section className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
          <h2 className="mb-4 text-lg font-medium text-zinc-200">Quality Dashboard</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quality.map((q) => (
              <div key={q.task_class} className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-3">
                <h3 className="mb-2 text-sm font-medium text-zinc-200">{q.task_class}</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Cost/day</span>
                    <span className="text-zinc-200">${q.cost_per_day_usd.toFixed(4)}</span>
                  </div>
                  {Object.entries(q.latency_p95_ms).map(([tier, ms]) => (
                    <div key={tier} className="flex items-center justify-between text-zinc-500">
                      <span>{TIER_LABELS[tier] ?? tier} p95</span>
                      <span>{ms}ms</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Distribution</span>
                    <div className="flex gap-1">
                      {Object.entries(q.tier_distribution).map(([tier, pct]) => (
                        <span key={tier} className={`rounded px-1 py-0.5 text-[10px] ${TIER_COLORS[tier] ?? 'bg-zinc-700/20 text-zinc-400 border-zinc-700/30'}`}>
                          {pct}%
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
