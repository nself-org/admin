'use client'

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const MUX_API = 'http://127.0.0.1:3711'

// ── Types ──────────────────────────────────────────────────────────────────────

type PluginStatus = 'checking' | 'running' | 'stopped'

interface DeadLetterMessage {
  message_id: string
  rule_id: string
  failed_at: string
  reason: string
  retry_count: number
  payload: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DeadLetterPage() {
  const [pluginStatus, setPluginStatus] = useState<PluginStatus>('checking')
  const [refreshing, setRefreshing] = useState(false)
  const [messages, setMessages] = useState<DeadLetterMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRuleId, setFilterRuleId] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [discardingId, setDiscardingId] = useState<string | null>(null)
  const [discardingAll, setDiscardingAll] = useState(false)
  const [confirmDiscardId, setConfirmDiscardId] = useState<string | null>(null)
  const [confirmDiscardAll, setConfirmDiscardAll] = useState(false)

  // ── Health check ────────────────────────────────────────────────────────────

  const checkHealth = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setPluginStatus('checking')
    try {
      const res = await fetch(`${MUX_API}/health`, {
        signal: AbortSignal.timeout(4000),
      })
      setPluginStatus(res.ok ? 'running' : 'stopped')
    } catch {
      setPluginStatus('stopped')
    } finally {
      if (showRefreshing) setRefreshing(false)
    }
  }

  // ── Fetch messages ──────────────────────────────────────────────────────────

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${MUX_API}/mux/dead-letter`, { cache: 'no-store' })
      if (!res.ok) {
        setMessages([])
        return
      }
      const data = (await res.json()) as { messages: DeadLetterMessage[] }
      setMessages(data.messages ?? [])
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  // ── Initial load + auto-refresh ─────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      await checkHealth()
      await fetchMessages()
    }
    void init()

    const interval = setInterval(async () => {
      await fetchMessages()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // ── Manual refresh ──────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true)
    setLoading(true)
    await checkHealth()
    await fetchMessages()
    setRefreshing(false)
  }

  // ── Retry message ────────────────────────────────────────────────────────────

  const handleRetry = async (id: string) => {
    setRetryingId(id)
    try {
      await fetch(`${MUX_API}/mux/dead-letter/${encodeURIComponent(id)}/retry`, {
        method: 'POST',
      })
      await fetchMessages()
    } catch {
      // network error — leave message in list
    } finally {
      setRetryingId(null)
    }
  }

  // ── Discard message ──────────────────────────────────────────────────────────

  const handleDiscard = async (id: string) => {
    setConfirmDiscardId(null)
    setDiscardingId(id)
    setMessages((prev) => prev.filter((m) => m.message_id !== id))
    try {
      await fetch(`${MUX_API}/mux/dead-letter/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
    } catch {
      // optimistic removal already done
    } finally {
      setDiscardingId(null)
    }
  }

  // ── Discard all ──────────────────────────────────────────────────────────────

  const handleDiscardAll = async () => {
    setConfirmDiscardAll(false)
    setDiscardingAll(true)
    setMessages([])
    try {
      await fetch(`${MUX_API}/mux/dead-letter`, { method: 'DELETE' })
    } catch {
      // optimistic clear already done
    } finally {
      setDiscardingAll(false)
    }
  }

  // ── Filtered messages ────────────────────────────────────────────────────────

  const filtered = filterRuleId.trim()
    ? messages.filter((m) =>
        m.rule_id.toLowerCase().includes(filterRuleId.trim().toLowerCase()),
      )
    : messages

  // ── Confirm dialogs ──────────────────────────────────────────────────────────

  if (confirmDiscardId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
          <h2 className="text-base font-semibold text-white">Delete this message?</h2>
          <p className="mt-2 text-sm text-zinc-400">It cannot be recovered.</p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmDiscardId(null)}
              className="rounded-lg border border-zinc-600 bg-zinc-700/50 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleDiscard(confirmDiscardId)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (confirmDiscardAll) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
          <h2 className="text-base font-semibold text-white">Delete ALL failed messages?</h2>
          <p className="mt-2 text-sm text-zinc-400">
            This cannot be undone. All {messages.length} messages will be permanently deleted.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmDiscardAll(false)}
              className="rounded-lg border border-zinc-600 bg-zinc-700/50 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleDiscardAll()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              Delete All
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-white">Dead Letter Queue</h1>
            {messages.length > 0 && (
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-300">
                {messages.length}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-zinc-400">
            Failed messages from nself-mux delivery attempts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={pluginStatus} />
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Plugin offline warning */}
      {pluginStatus === 'stopped' && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">nself-mux is not running</p>
              <p className="mt-1 text-sm text-yellow-400/80">
                The dead-letter queue is unavailable while nself-mux is offline.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 border-b border-zinc-700/50 px-5 py-4">
          <input
            type="text"
            value={filterRuleId}
            onChange={(e) => setFilterRuleId(e.target.value)}
            placeholder="Filter by rule_id…"
            className="w-56 rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          />
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmDiscardAll(true)}
              disabled={discardingAll}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-50"
            >
              {discardingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Discard All
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 animate-pulse rounded-lg bg-zinc-700/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-green-600" />
            <p className="text-sm font-medium text-zinc-400">No failed messages</p>
            <p className="mt-0.5 text-xs text-zinc-600">
              {filterRuleId ? 'No messages match the filter' : 'Dead letter queue is empty'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-700/50">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_1fr_80px_1fr_40px_160px] gap-3 px-5 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <span>Message ID</span>
              <span>Rule ID</span>
              <span>Retries</span>
              <span>Failed</span>
              <span></span>
              <span className="text-right">Actions</span>
            </div>

            {filtered.map((msg) => (
              <div key={msg.message_id}>
                <div className="grid grid-cols-[1fr_1fr_80px_1fr_40px_160px] items-center gap-3 px-5 py-3.5">
                  <span className="truncate font-mono text-xs text-zinc-400">
                    {msg.message_id.slice(0, 12)}…
                  </span>
                  <span className="truncate text-sm text-zinc-300">{msg.rule_id}</span>
                  <span className="text-sm text-zinc-400">{msg.retry_count}</span>
                  <div>
                    <span className="text-sm text-zinc-300">{relativeTime(msg.failed_at)}</span>
                    <p className="mt-0.5 truncate text-xs text-zinc-600">
                      {msg.reason.slice(0, 50)}
                    </p>
                  </div>

                  {/* Inspect toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((prev) =>
                        prev === msg.message_id ? null : msg.message_id,
                      )
                    }
                    className="rounded p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label="Inspect payload"
                  >
                    {expandedId === msg.message_id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {/* Row actions */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRetry(msg.message_id)}
                      disabled={retryingId === msg.message_id}
                      className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-600/20 px-2.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-600/30 disabled:opacity-50"
                      aria-label="Retry message"
                    >
                      {retryingId === msg.message_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDiscardId(msg.message_id)}
                      disabled={discardingId === msg.message_id}
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-600/20 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-50"
                      aria-label="Discard message"
                    >
                      {discardingId === msg.message_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Discard
                    </button>
                  </div>
                </div>

                {/* Expanded payload */}
                {expandedId === msg.message_id && (
                  <div className="border-t border-zinc-700/30 bg-zinc-900/50 px-5 py-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Full Payload
                    </p>
                    <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(msg.payload), null, 2)
                        } catch {
                          return msg.payload
                        }
                      })()}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
