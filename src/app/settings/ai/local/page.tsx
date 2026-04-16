'use client'

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Download,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

const AI_API = 'http://127.0.0.1:8010'

// ── Types ─────────────────────────────────────────────────────────────────────

interface OllamaStatus {
  reachable: boolean
  version: string
  host: string
  uptime_seconds: number
  ram_total_gb: number
  ram_used_gb: number
  loaded_model: string | null
}

interface LocalModel {
  name: string
  size_gb: number
  parameter_count: string
  quantization: string
  tasks: string[]
  is_default: boolean
  tokens_per_sec: number | null
  last_benchmark: string | null
}

interface TaskAssignment {
  task: string
  model: string
  last_test: string | null
  latency_ms: number | null
}

interface RecommendedModel {
  name: string
  size_gb: number
  description: string
  min_ram_gb: number
}

interface InstallJob {
  id: string
  status: 'pending' | 'running' | 'done' | 'error'
}

type PageState = 'loading' | 'ready' | 'error' | 'not-installed'

const TASK_CLASSES = ['chat', 'embeddings', 'classify', 'extract'] as const

// ── Component ─────────────────────────────────────────────────────────────────

export default function LocalModelsPage() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<OllamaStatus | null>(null)
  const [models, setModels] = useState<LocalModel[]>([])
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [recommended, setRecommended] = useState<RecommendedModel[]>([])
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [installLogs, setInstallLogs] = useState<string[]>([])
  const [installJobId, setInstallJobId] = useState<string | null>(null)
  const [installDone, setInstallDone] = useState(false)
  const [showAddModel, setShowAddModel] = useState(false)
  const [addModelName, setAddModelName] = useState('')
  const [addingModel, setAddingModel] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [benchmarking, setBenchmarking] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [bgOnlyLocal, setBgOnlyLocal] = useState(false)
  const [oomAutoSwap, setOomAutoSwap] = useState(true)
  const [autoBenchmark, setAutoBenchmark] = useState(true)
  const [savingAdvanced, setSavingAdvanced] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const fetchAll = useCallback(async () => {
    setPageState('loading')
    setError('')
    try {
      const [sRes, mRes, aRes, rRes] = await Promise.all([
        fetch(`${AI_API}/ai/local/status`),
        fetch(`${AI_API}/ai/local/models`),
        fetch(`${AI_API}/ai/local/assignments`),
        fetch(`${AI_API}/ai/local/recommended`),
      ])
      if (!sRes.ok) {
        const d = await sRes.json().catch(() => ({}))
        if (d.code === 'OLLAMA_NOT_INSTALLED') {
          setPageState('not-installed')
          return
        }
        throw new Error(`Status: HTTP ${sRes.status}`)
      }
      setStatus(await sRes.json())
      setModels(mRes.ok ? ((await mRes.json()).models ?? []) : [])
      setAssignments(aRes.ok ? ((await aRes.json()).assignments ?? []) : [])
      setRecommended(rRes.ok ? ((await rRes.json()).recommended ?? []) : [])
      setPageState('ready')
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to load local AI status.',
      )
      setPageState('error')
    }
  }, [])

  useEffect(() => {
    fetchAll()
    return () => {
      eventSourceRef.current?.close()
    }
  }, [fetchAll])

  async function startInstall() {
    setInstallLogs([])
    setInstallDone(false)
    try {
      const res = await fetch(`${AI_API}/ai/local/install`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: InstallJob = await res.json()
      setInstallJobId(data.id)
      const es = new EventSource(
        `${AI_API}/ai/local/install/jobs/${data.id}/events`,
      )
      eventSourceRef.current = es
      es.onmessage = (ev) => {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'log') {
          setInstallLogs((prev) => [...prev, msg.message])
        } else if (msg.type === 'done') {
          setInstallDone(true)
          es.close()
        } else if (msg.type === 'error') {
          setInstallLogs((prev) => [...prev, `Error: ${msg.message}`])
          es.close()
        }
      }
      es.onerror = () => {
        setInstallLogs((prev) => [...prev, 'Connection lost.'])
        es.close()
      }
    } catch {
      setInstallLogs(['Failed to start install.'])
    }
  }

  async function addModel() {
    if (!addModelName.trim()) return
    setAddingModel(true)
    try {
      const res = await fetch(`${AI_API}/ai/local/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addModelName.trim() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setShowAddModel(false)
      setAddModelName('')
      await fetchAll()
    } catch {
      setError('Failed to add model.')
    }
    setAddingModel(false)
  }

  async function removeModel(name: string) {
    try {
      await fetch(`${AI_API}/ai/local/models/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      })
      setMenuOpen(null)
      await fetchAll()
    } catch {
      setError('Failed to remove model.')
    }
  }

  async function setDefaultFor(modelName: string, task: string) {
    try {
      await fetch(`${AI_API}/ai/local/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, model: modelName }),
      })
      setMenuOpen(null)
      await fetchAll()
    } catch {
      setError('Failed to set default.')
    }
  }

  async function testTask(task: string) {
    setTesting(task)
    try {
      await fetch(`${AI_API}/ai/local/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      })
      await fetchAll()
    } catch {
      setError(`Test failed for ${task}.`)
    }
    setTesting(null)
  }

  async function benchmarkModel(name: string) {
    setBenchmarking(name)
    setMenuOpen(null)
    try {
      const res = await fetch(`${AI_API}/ai/local/benchmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: name }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const job = await res.json()
      const es = new EventSource(
        `${AI_API}/ai/local/benchmark/jobs/${job.id}/events`,
      )
      es.onmessage = (ev) => {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'done' || msg.type === 'error') {
          es.close()
          setBenchmarking(null)
          fetchAll()
        }
      }
      es.onerror = () => {
        es.close()
        setBenchmarking(null)
      }
    } catch {
      setError('Benchmark failed.')
      setBenchmarking(null)
    }
  }

  async function saveAdvanced() {
    setSavingAdvanced(true)
    try {
      await fetch(`${AI_API}/ai/local/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          background_only_local: bgOnlyLocal,
          oom_auto_swap: oomAutoSwap,
          auto_benchmark: autoBenchmark,
        }),
      })
    } catch {
      setError('Failed to save advanced settings.')
    }
    setSavingAdvanced(false)
  }

  async function restartOllama() {
    try {
      await fetch(`${AI_API}/ai/local/restart`, { method: 'POST' })
      await fetchAll()
    } catch {
      setError('Failed to restart Ollama.')
    }
  }

  function formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  // ── Not Installed State ───────────────────────────────────────────────────

  if (pageState === 'not-installed') {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-100">
          Local Models
        </h1>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-8 text-center">
          <Cpu className="mx-auto mb-4 h-12 w-12 text-zinc-500" />
          <h2 className="mb-2 text-lg font-medium text-zinc-200">
            Ollama Not Installed
          </h2>
          <p className="mb-6 text-sm text-zinc-400">
            Install Ollama to run AI models locally on your machine. No API keys
            needed, completely private.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setShowInstallModal(true)
                startInstall()
              }}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
            >
              <Download className="mr-2 inline h-4 w-4" />
              Install Ollama
            </button>
            <button
              onClick={() => window.history.back()}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
            >
              Skip &mdash; Use Cloud Only
            </button>
          </div>
        </div>

        {showInstallModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-zinc-100">
                  Installing Ollama
                </h3>
                {installDone && (
                  <button
                    onClick={() => {
                      setShowInstallModal(false)
                      fetchAll()
                    }}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg bg-black/40 p-3 font-mono text-xs text-zinc-300">
                {installLogs.length === 0 ? (
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> Starting
                    install...
                  </div>
                ) : (
                  installLogs.map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {installDone && i === installLogs.length - 1 ? (
                        <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-400" />
                      ) : (
                        <span className="mt-0.5 h-3 w-3 flex-shrink-0 text-zinc-600">
                          &bull;
                        </span>
                      )}
                      <span>{line}</span>
                    </div>
                  ))
                )}
              </div>
              {installDone && (
                <button
                  onClick={() => {
                    setShowInstallModal(false)
                    fetchAll()
                  }}
                  className="mt-4 w-full rounded-lg bg-sky-500 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
                >
                  Continue to Settings
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Loading State ─────────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-100">
          Local Models
        </h1>
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-16 animate-pulse rounded-xl bg-zinc-800/50"
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Error State ───────────────────────────────────────────────────────────

  if (pageState === 'error') {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-100">
          Local Models
        </h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <p className="mb-4 text-sm text-red-300">{error}</p>
          <button
            onClick={fetchAll}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ── Ready State ───────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Local Models</h1>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── Ollama Status ─────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-200">Ollama Status</h2>
          <div className="flex items-center gap-2">
            {status?.reachable ? (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 className="h-3 w-3" /> Running
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle className="h-3 w-3" /> Unreachable
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <div>
            <span className="text-zinc-500">Version</span>
            <p className="text-zinc-200">{status?.version ?? 'Unknown'}</p>
          </div>
          <div>
            <span className="text-zinc-500">Host</span>
            <p className="text-zinc-200">{status?.host ?? '127.0.0.1:11434'}</p>
          </div>
          <div>
            <span className="text-zinc-500">Uptime</span>
            <p className="text-zinc-200">
              {status ? formatUptime(status.uptime_seconds) : '-'}
            </p>
          </div>
          <div>
            <span className="text-zinc-500">RAM</span>
            <p className="text-zinc-200">
              {status
                ? `${status.ram_used_gb.toFixed(1)} / ${status.ram_total_gb.toFixed(1)} GB`
                : '-'}
            </p>
          </div>
          <div>
            <span className="text-zinc-500">Loaded Model</span>
            <p className="text-zinc-200">{status?.loaded_model ?? 'None'}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={restartOllama}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:text-zinc-200"
          >
            <RefreshCw className="mr-1 inline h-3 w-3" /> Restart Ollama
          </button>
        </div>
      </section>

      {/* ── Installed Models ──────────────────────────────────────────────── */}
      <section className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-200">
            Installed Models
          </h2>
          <button
            onClick={() => setShowAddModel(true)}
            className="rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs text-sky-300 transition hover:bg-sky-500/30"
          >
            <Plus className="mr-1 inline h-3 w-3" /> Add Model
          </button>
        </div>

        {showAddModel && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 p-3">
            <input
              value={addModelName}
              onChange={(e) => setAddModelName(e.target.value)}
              placeholder="e.g. gemma2:2b, llama3.1:8b"
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addModel()
              }}
            />
            <button
              onClick={addModel}
              disabled={addingModel}
              className="rounded bg-sky-500 px-3 py-1 text-xs text-white disabled:opacity-50"
            >
              {addingModel ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Pull'
              )}
            </button>
            <button
              onClick={() => setShowAddModel(false)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {models.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No models installed. Pull a model to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700/50 text-left text-xs text-zinc-500">
                  <th className="pr-4 pb-2">Name</th>
                  <th className="pr-4 pb-2">Size</th>
                  <th className="pr-4 pb-2">Tasks</th>
                  <th className="pr-4 pb-2">Default</th>
                  <th className="pr-4 pb-2">tok/s</th>
                  <th className="w-8 pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.name} className="border-b border-zinc-800/50">
                    <td className="py-3 pr-4 text-zinc-200">{m.name}</td>
                    <td className="py-3 pr-4 text-zinc-400">
                      {m.size_gb.toFixed(1)} GB
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {m.tasks.map((t) => (
                          <span
                            key={t}
                            className="rounded bg-zinc-700/50 px-1.5 py-0.5 text-xs text-zinc-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {m.is_default && (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      )}
                    </td>
                    <td className="py-3 pr-4 text-zinc-400">
                      {benchmarking === m.name ? (
                        <Loader2 className="h-3 w-3 animate-spin text-sky-400" />
                      ) : (
                        (m.tokens_per_sec?.toFixed(0) ?? '-')
                      )}
                    </td>
                    <td className="relative py-3">
                      <button
                        onClick={() =>
                          setMenuOpen(menuOpen === m.name ? null : m.name)
                        }
                        className="text-zinc-500 hover:text-zinc-300"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuOpen === m.name && (
                        <div className="absolute top-10 right-0 z-10 w-48 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                          {TASK_CLASSES.map((task) => (
                            <button
                              key={task}
                              onClick={() => setDefaultFor(m.name, task)}
                              className="w-full px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                            >
                              Set default for {task}
                            </button>
                          ))}
                          <hr className="my-1 border-zinc-800" />
                          <button
                            onClick={() => benchmarkModel(m.name)}
                            className="w-full px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          >
                            <Zap className="mr-1.5 inline h-3 w-3" /> Run
                            benchmark
                          </button>
                          <hr className="my-1 border-zinc-800" />
                          <button
                            onClick={() => removeModel(m.name)}
                            className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-zinc-800"
                          >
                            <Trash2 className="mr-1.5 inline h-3 w-3" /> Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Task Assignment ───────────────────────────────────────────────── */}
      <section className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
        <h2 className="mb-4 text-lg font-medium text-zinc-200">
          Task Assignment
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TASK_CLASSES.map((task) => {
            const a = assignments.find((x) => x.task === task)
            return (
              <div
                key={task}
                className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-200 capitalize">
                    {task}
                  </span>
                  <button
                    onClick={() => testTask(task)}
                    disabled={testing === task}
                    className="rounded bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
                  >
                    {testing === task ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </button>
                </div>
                <select
                  value={a?.model ?? ''}
                  onChange={(e) => setDefaultFor(e.target.value, task)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200"
                >
                  <option value="">Auto</option>
                  {models.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {a?.latency_ms != null && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Last test: {a.latency_ms}ms
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Recommended Models ────────────────────────────────────────────── */}
      {recommended.length > 0 && (
        <section className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
          <h2 className="mb-4 text-lg font-medium text-zinc-200">
            Recommended for Your Hardware
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {recommended.map((r) => (
              <div
                key={r.name}
                className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-200">
                    {r.name}
                  </span>
                  <span className="text-xs text-zinc-500">{r.size_gb} GB</span>
                </div>
                <p className="mb-2 text-xs text-zinc-400">{r.description}</p>
                <p className="text-xs text-zinc-500">
                  Requires {r.min_ram_gb} GB RAM
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Advanced ──────────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex w-full items-center justify-between text-sm text-zinc-400 transition hover:text-zinc-200"
        >
          <span>Advanced Settings</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {advancedOpen && (
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={bgOnlyLocal}
                onChange={(e) => setBgOnlyLocal(e.target.checked)}
                className="h-4 w-4"
              />
              Background-only local (never block on local inference)
            </label>
            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={oomAutoSwap}
                onChange={(e) => setOomAutoSwap(e.target.checked)}
                className="h-4 w-4"
              />
              Auto-swap model on OOM
            </label>
            <label className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={autoBenchmark}
                onChange={(e) => setAutoBenchmark(e.target.checked)}
                className="h-4 w-4"
              />
              Auto-benchmark new models
            </label>
            <div className="pt-2">
              <button
                onClick={saveAdvanced}
                disabled={savingAdvanced}
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm text-white transition hover:bg-sky-400 disabled:opacity-50"
              >
                {savingAdvanced ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
