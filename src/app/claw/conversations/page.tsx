'use client'

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCw,
  Trash2,
  Wrench,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const CLAW_API = 'http://127.0.0.1:3710'

// ── Types ──────────────────────────────────────────────────────────────────────

type PluginStatus = 'checking' | 'running' | 'stopped'

interface Conversation {
  session_id: string
  user_id: string
  message_count: number
  last_message: string
  started_at: string
}

interface Message {
  role: 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: { name: string; args: Record<string, unknown> }[]
  timestamp: string
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

export default function ConversationsPage() {
  const [pluginStatus, setPluginStatus] = useState<PluginStatus>('checking')
  const [refreshing, setRefreshing] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [convoLoading, setConvoLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<Message[]>([])
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // ── Health check ────────────────────────────────────────────────────────────

  const checkHealth = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setPluginStatus('checking')
    try {
      const res = await fetch(`${CLAW_API}/health`, {
        signal: AbortSignal.timeout(4000),
      })
      setPluginStatus(res.ok ? 'running' : 'stopped')
    } catch {
      setPluginStatus('stopped')
    } finally {
      if (showRefreshing) setRefreshing(false)
    }
  }

  // ── Fetch conversations ─────────────────────────────────────────────────────

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${CLAW_API}/admin/conversations`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        setConversations([])
        return
      }
      const data = (await res.json()) as { conversations: Conversation[] }
      setConversations(data.conversations ?? [])
    } catch {
      setConversations([])
    } finally {
      setConvoLoading(false)
    }
  }

  // ── Fetch transcript ────────────────────────────────────────────────────────

  const fetchTranscript = async (sessionId: string) => {
    setTranscriptLoading(true)
    setTranscript([])
    try {
      const res = await fetch(
        `${CLAW_API}/admin/conversations/${encodeURIComponent(sessionId)}/messages`,
        { cache: 'no-store' },
      )
      if (!res.ok) {
        setTranscript([])
        return
      }
      const data = (await res.json()) as { messages: Message[] }
      setTranscript(data.messages ?? [])
    } catch {
      setTranscript([])
    } finally {
      setTranscriptLoading(false)
    }
  }

  // ── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      await checkHealth()
      await fetchConversations()
    }
    void init()
  }, [])

  // ── Select conversation ─────────────────────────────────────────────────────

  const handleSelect = (sessionId: string) => {
    setSelectedId(sessionId)
    void fetchTranscript(sessionId)
  }

  // ── Refresh ─────────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true)
    setConvoLoading(true)
    await checkHealth()
    await fetchConversations()
    setRefreshing(false)
  }

  // ── Delete conversation ─────────────────────────────────────────────────────

  const handleDelete = async (sessionId: string) => {
    setConfirmDeleteId(null)
    setDeletingId(sessionId)
    if (selectedId === sessionId) {
      setSelectedId(null)
      setTranscript([])
    }
    setConversations((prev) => prev.filter((c) => c.session_id !== sessionId))
    try {
      await fetch(
        `${CLAW_API}/admin/conversations/${encodeURIComponent(sessionId)}`,
        { method: 'DELETE' },
      )
    } catch {
      // optimistic removal done
    } finally {
      setDeletingId(null)
    }
  }

  // ── Filtered conversations ──────────────────────────────────────────────────

  const filtered = search.trim()
    ? conversations.filter(
        (c) =>
          c.session_id.toLowerCase().includes(search.toLowerCase()) ||
          c.last_message.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations

  // ── Confirm dialog ──────────────────────────────────────────────────────────

  if (confirmDeleteId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
          <h2 className="text-base font-semibold text-white">
            Delete this conversation?
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            This will delete the conversation and all its messages. This cannot
            be undone.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="rounded-lg border border-zinc-600 bg-zinc-700/50 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleDelete(confirmDeleteId)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              Delete
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
          <h1 className="text-2xl font-semibold text-white">Conversations</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Browse ɳClaw conversation history — admin access required
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
              <p className="font-medium text-yellow-300">
                nself-claw is not running
              </p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Install and start the ɳClaw plugin to browse conversations.
              </p>
              <div className="mt-3 rounded-lg bg-zinc-900/50 px-3 py-2 font-mono text-xs text-zinc-300">
                nself plugin install claw
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin note */}
      <div className="flex items-center gap-2 rounded-lg border border-zinc-700/40 bg-zinc-800/30 px-4 py-3">
        <AlertCircle className="h-4 w-4 shrink-0 text-zinc-500" />
        <p className="text-xs text-zinc-500">
          Admin access required. Requests to nself-claw must include an admin
          JWT.
        </p>
      </div>

      {/* Content: list + transcript panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: conversation list */}
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50">
          <div className="border-b border-zinc-700/50 px-5 py-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none"
            />
          </div>

          {convoLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-16 animate-pulse rounded-lg bg-zinc-700/40"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="mb-2 h-7 w-7 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                {search ? 'No conversations match' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-700/50">
              {filtered.map((c) => (
                <div
                  key={c.session_id}
                  className={`cursor-pointer px-5 py-3.5 transition-colors hover:bg-zinc-700/30 ${
                    selectedId === c.session_id
                      ? 'border-l-2 border-indigo-500 bg-zinc-700/40'
                      : ''
                  }`}
                  onClick={() => handleSelect(c.session_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      handleSelect(c.session_id)
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {c.user_id}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-zinc-600">
                        {c.session_id.slice(0, 12)}…
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {c.last_message.slice(0, 50)}
                        {c.last_message.length > 50 ? '…' : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="rounded-full border border-zinc-600/50 bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-400">
                        {c.message_count}
                      </span>
                      <p className="mt-1 text-xs text-zinc-600">
                        {new Date(c.started_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDeleteId(c.session_id)
                      }}
                      disabled={deletingId === c.session_id}
                      className="rounded p-1 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      aria-label="Delete conversation"
                    >
                      {deletingId === c.session_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: transcript panel */}
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50">
          <div className="border-b border-zinc-700/50 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">
              {selectedId ? 'Transcript' : 'Select a conversation'}
            </h2>
            {selectedId && (
              <p className="mt-0.5 font-mono text-xs text-zinc-600">
                {selectedId.slice(0, 20)}…
              </p>
            )}
          </div>

          {!selectedId ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="mb-2 h-8 w-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                Click a conversation to view transcript
              </p>
            </div>
          ) : transcriptLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-14 animate-pulse rounded-lg bg-zinc-700/40"
                />
              ))}
            </div>
          ) : transcript.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="mb-2 h-7 w-7 text-zinc-700" />
              <p className="text-sm text-zinc-500">No messages found</p>
            </div>
          ) : (
            <div className="max-h-[600px] space-y-3 overflow-y-auto p-4">
              {transcript.map((msg, i) => {
                if (msg.role === 'tool' || msg.tool_calls) {
                  return (
                    <div
                      key={i}
                      className="ml-4 rounded-lg border border-zinc-700/30 bg-zinc-900/50 px-3 py-2"
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <Wrench className="h-3 w-3 text-zinc-500" />
                        <span className="text-xs font-medium text-zinc-500">
                          {msg.tool_calls?.[0]?.name ?? 'tool_result'}
                        </span>
                      </div>
                      <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap text-zinc-400">
                        {msg.tool_calls
                          ? JSON.stringify(
                              msg.tool_calls[0]?.args ?? {},
                              null,
                              2,
                            )
                          : msg.content.slice(0, 200)}
                      </pre>
                    </div>
                  )
                }

                const isUser = msg.role === 'user'
                return (
                  <div
                    key={i}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        isUser
                          ? 'bg-zinc-600 text-zinc-100'
                          : 'bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      <p className="break-words whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      <p className="mt-1 text-right text-xs opacity-50">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
