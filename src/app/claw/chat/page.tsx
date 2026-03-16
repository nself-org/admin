'use client'

import {
  AlertCircle,
  Bot,
  ChevronDown,
  ChevronUp,
  Layout,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  User,
  Wrench,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const CLAW_API = 'http://127.0.0.1:3710'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClawSession {
  id: string
  user_id: string
  name?: string
  created_at: string
  updated_at: string
  is_admin_mode: boolean
}

interface ToolCall {
  name: string
  args: Record<string, unknown>
  result?: string
}

interface CanvasFrame {
  kind: 'card' | 'list' | 'form' | 'chart' | string
  data: Record<string, unknown>
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  tool_calls?: ToolCall[]
  canvas_frames?: CanvasFrame[]
  memories_used?: number
  timestamp: Date
}

// ── Canvas renderer ────────────────────────────────────────────────────────────

function CanvasRenderer({ frame }: { frame: CanvasFrame }) {
  switch (frame.kind) {
    case 'card': {
      const title = (frame.data.title as string) ?? ''
      const body = (frame.data.body as string) ?? ''
      return (
        <div className="mt-2 rounded-lg border border-indigo-500/30 bg-indigo-900/20 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Layout className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-indigo-300 uppercase tracking-wide">
              Card
            </span>
          </div>
          {title && (
            <p className="text-sm font-medium text-white mb-1">{title}</p>
          )}
          {body && <p className="text-sm text-zinc-300">{body}</p>}
        </div>
      )
    }
    case 'list': {
      const items = (frame.data.items as string[]) ?? []
      const title = (frame.data.title as string) ?? ''
      return (
        <div className="mt-2 rounded-lg border border-indigo-500/30 bg-indigo-900/20 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Layout className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-indigo-300 uppercase tracking-wide">
              List
            </span>
          </div>
          {title && (
            <p className="text-sm font-medium text-white mb-1">{title}</p>
          )}
          <ul className="space-y-0.5 pl-3">
            {items.map((item, i) => (
              <li key={i} className="text-sm text-zinc-300 list-disc">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )
    }
    case 'form': {
      const fields = (frame.data.fields as Array<{ label: string }>) ?? []
      const title = (frame.data.title as string) ?? ''
      return (
        <div className="mt-2 rounded-lg border border-indigo-500/30 bg-indigo-900/20 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Layout className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-indigo-300 uppercase tracking-wide">
              Form
            </span>
          </div>
          {title && (
            <p className="text-sm font-medium text-white mb-1">{title}</p>
          )}
          <div className="space-y-1">
            {fields.map((field, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">{field.label}</span>
                <div className="flex-1 h-6 rounded bg-zinc-700/50 border border-zinc-600/50" />
              </div>
            ))}
          </div>
        </div>
      )
    }
    case 'chart': {
      const description =
        (frame.data.description as string) ??
        (frame.data.title as string) ??
        'Chart'
      return (
        <div className="mt-2 rounded-lg border border-indigo-500/30 bg-indigo-900/20 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Layout className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-indigo-300 uppercase tracking-wide">
              Chart
            </span>
          </div>
          <p className="text-sm text-zinc-300">Chart: {description}</p>
        </div>
      )
    }
    default:
      return (
        <div className="mt-2 rounded-lg border border-zinc-600/50 bg-zinc-800/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Layout className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Canvas ({frame.kind})
            </span>
          </div>
          <pre className="text-xs text-zinc-400 overflow-auto">
            {JSON.stringify(frame.data, null, 2)}
          </pre>
        </div>
      )
  }
}

// ── Tool call accordion ────────────────────────────────────────────────────────

function ToolCallAccordion({ toolCall }: { toolCall: ToolCall }) {
  const [open, setOpen] = useState(false)
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="mt-2 rounded-lg border border-zinc-600/50 bg-zinc-900/50 overflow-hidden"
    >
      <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800/50">
        <Wrench className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
        <span className="flex-1">Tool: {toolCall.name}</span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
        )}
      </summary>
      <div className="border-t border-zinc-700/50 px-3 py-2 space-y-2">
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">
            Args
          </p>
          <pre className="text-xs text-zinc-300 overflow-auto rounded bg-zinc-950/50 p-2">
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
        </div>
        {toolCall.result !== undefined && (
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wide">
              Result
            </p>
            <pre className="text-xs text-zinc-300 overflow-auto rounded bg-zinc-950/50 p-2 whitespace-pre-wrap">
              {toolCall.result}
            </pre>
          </div>
        )}
      </div>
    </details>
  )
}

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage
  isStreaming?: boolean
}) {
  const isUser = message.role === 'user'

  // Parse canvas frames from content if present
  let displayContent = message.content
  const canvasFrames: CanvasFrame[] = message.canvas_frames ?? []

  // Try to detect canvas JSON in content
  if (!isUser && message.content.includes('"type":"canvas"')) {
    try {
      const parsed = JSON.parse(message.content) as {
        type: string
        ui: CanvasFrame
      }
      if (parsed.type === 'canvas' && parsed.ui) {
        canvasFrames.push(parsed.ui)
        displayContent = ''
      }
    } catch {
      // Not JSON, render as-is
    }
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5 ${
          isUser ? 'bg-indigo-600' : 'bg-zinc-700'
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-white" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-zinc-300" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-zinc-800 text-zinc-100 rounded-tl-sm border border-zinc-700/50'
          }`}
        >
          {displayContent || (isStreaming ? null : <span className="italic text-zinc-500">(no text)</span>)}
          {isStreaming && (
            <span className="inline-block ml-0.5 animate-pulse text-indigo-400">▋</span>
          )}
        </div>

        {/* Canvas frames */}
        {canvasFrames.map((frame, i) => (
          <div key={i} className="w-full">
            <CanvasRenderer frame={frame} />
          </div>
        ))}

        {/* Tool calls */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="w-full space-y-1">
            {message.tool_calls.map((tc, i) => (
              <ToolCallAccordion key={i} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Memory used badge */}
        {message.memories_used !== undefined && message.memories_used > 0 && (
          <span className="text-xs text-zinc-600">
            {message.memories_used} memor{message.memories_used === 1 ? 'y' : 'ies'} recalled
          </span>
        )}

        <span className="text-xs text-zinc-600">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}

// ── Session sidebar ────────────────────────────────────────────────────────────

function SessionSidebar({
  sessions,
  currentSessionId,
  onSelect,
  onNew,
  onDelete,
  loading,
}: {
  sessions: ClawSession[]
  currentSessionId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  loading: boolean
}) {
  return (
    <div className="flex h-full w-60 shrink-0 flex-col border-r border-zinc-700/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-700/50 px-4 py-3">
        <p className="text-sm font-medium text-white">Sessions</p>
        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="space-y-1 p-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-12 animate-pulse rounded-lg bg-zinc-800/50"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Bot className="mb-2 h-6 w-6 text-zinc-600" />
            <p className="text-xs text-zinc-500">No sessions yet</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              Start a new conversation
            </p>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === currentSessionId
            return (
              <div
                key={session.id}
                className={`group mx-1 my-0.5 flex cursor-pointer items-start justify-between gap-2 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-indigo-600/20 border border-indigo-500/30'
                    : 'hover:bg-zinc-800/50'
                }`}
                onClick={() => onSelect(session.id)}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-xs font-medium ${
                      isActive ? 'text-indigo-200' : 'text-zinc-300'
                    }`}
                  >
                    {session.name ?? `Session ${session.id.slice(0, 8)}`}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(session.id)
                  }}
                  className="shrink-0 rounded p-0.5 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                  aria-label="Delete session"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ClawChatPage() {
  const [sessions, setSessions] = useState<ClawSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [clawDown, setClawDown] = useState(false)
  const [refreshingSessions, setRefreshingSessions] = useState(false)
  const [lastMemoriesUsed, setLastMemoriesUsed] = useState<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText])

  // ── Fetch sessions ───────────────────────────────────────────────────────────

  const fetchSessions = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshingSessions(true)
    try {
      const res = await fetch(`${CLAW_API}/claw/sessions`)
      if (!res.ok) {
        setClawDown(true)
        return
      }
      const data = (await res.json()) as { sessions: ClawSession[] }
      setSessions(data.sessions ?? [])
      setClawDown(false)
    } catch {
      setClawDown(true)
    } finally {
      setSessionsLoading(false)
      setRefreshingSessions(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  // ── Delete session ───────────────────────────────────────────────────────────

  const handleDeleteSession = async (id: string) => {
    try {
      await fetch(`${CLAW_API}/claw/sessions/${id}`, { method: 'DELETE' })
    } catch {
      // ignore network errors
    }
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (currentSessionId === id) {
      setCurrentSessionId(null)
      setMessages([])
    }
  }

  // ── New session ──────────────────────────────────────────────────────────────

  const handleNewSession = () => {
    setCurrentSessionId(null)
    setMessages([])
    setStreamingText('')
    setLastMemoriesUsed(null)
  }

  // ── Select session ───────────────────────────────────────────────────────────

  const handleSelectSession = (id: string) => {
    if (id === currentSessionId) return
    setCurrentSessionId(id)
    setMessages([])
    setStreamingText('')
    setLastMemoriesUsed(null)
  }

  // ── Send message ─────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setStreaming(true)
    setStreamingText('')
    setLastMemoriesUsed(null)

    try {
      const res = await fetch(`${CLAW_API}/claw/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId ?? undefined,
          message: text,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let fullText = ''
      let newSessionId: string | null = null
      let memoriesUsed: number | undefined

      while (!done) {
        const { value, done: streamDone } = await reader.read()
        done = streamDone
        if (value) {
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const raw = line.slice(6).trim()
              if (raw === '[DONE]') {
                done = true
                break
              }
              try {
                const j = JSON.parse(raw) as {
                  delta?: string
                  content?: string
                  text?: string
                  session_id?: string
                  memories_used?: number
                }
                const delta = j.delta ?? j.content ?? j.text ?? ''
                fullText += delta
                setStreamingText(fullText)
                if (j.session_id) newSessionId = j.session_id
                if (j.memories_used !== undefined)
                  memoriesUsed = j.memories_used
              } catch {
                // skip non-JSON lines
              }
            }
          }
        }
      }

      // Commit assistant message
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: fullText,
        memories_used: memoriesUsed,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setStreamingText('')
      if (memoriesUsed !== undefined) setLastMemoriesUsed(memoriesUsed)

      // Register new session
      if (newSessionId && !currentSessionId) {
        setCurrentSessionId(newSessionId)
        // Refresh session list to show the new one
        await fetchSessions()
      }
    } catch (_err) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Failed to get a response. Is ɳClaw running?',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errMsg])
      setStreamingText('')
    } finally {
      setStreaming(false)
    }
  }

  // ── Keyboard handler ─────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Claw down state ──────────────────────────────────────────────────────────

  if (!sessionsLoading && clawDown) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">ɳClaw Chat</h1>
          <button
            type="button"
            onClick={() => fetchSessions(true)}
            disabled={refreshingSessions}
            className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            {refreshingSessions ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Retry
          </button>
        </div>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">
                nself-claw is not running
              </p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Install and start the claw plugin to use the chat interface.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Main layout ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Page header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-700/50 px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">ɳClaw Chat</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            AI assistant powered by nself-claw
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Memory recall indicator */}
          {lastMemoriesUsed !== null && (
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-1.5">
              <span className="text-xs text-zinc-500">Recall</span>
              <span className="text-xs font-medium text-indigo-300">
                {lastMemoriesUsed} memor{lastMemoriesUsed === 1 ? 'y' : 'ies'}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fetchSessions(true)}
            disabled={refreshingSessions}
            className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            {refreshingSessions ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Body: sidebar + chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelect={handleSelectSession}
          onNew={handleNewSession}
          onDelete={handleDeleteSession}
          loading={sessionsLoading}
        />

        {/* Chat area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 && !streaming ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600/20 border border-indigo-500/30">
                  <Bot className="h-7 w-7 text-indigo-400" />
                </div>
                <p className="text-base font-medium text-zinc-300">
                  {currentSessionId
                    ? 'Continue the conversation'
                    : 'Start a conversation'}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Type a message below and press Enter to chat
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {/* Streaming bubble */}
                {streaming && streamingText && (
                  <MessageBubble
                    message={{
                      id: '__streaming__',
                      role: 'assistant',
                      content: streamingText,
                      timestamp: new Date(),
                    }}
                    isStreaming
                  />
                )}
                {/* Spinner while waiting for first token */}
                {streaming && !streamingText && (
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-700 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-zinc-300" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-zinc-700/50 bg-zinc-800 px-4 py-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                      <span className="text-sm text-zinc-500">Thinking...</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="shrink-0 border-t border-zinc-700/50 px-6 py-4">
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message ɳClaw… (Enter to send, Shift+Enter for newline)"
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none rounded-xl border border-zinc-600/50 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-50 max-h-36 overflow-y-auto"
                style={{ lineHeight: '1.5' }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-600">
              {currentSessionId
                ? `Session ${currentSessionId.slice(0, 8)}…`
                : 'New session — will be created on first message'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
