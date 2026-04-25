'use client'

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const CLAW_API = 'http://127.0.0.1:3710'

// ── Types ──────────────────────────────────────────────────────────────────────

type PluginStatus = 'checking' | 'running' | 'stopped'

interface ClawTopic {
  id: string
  name: string
  slug: string
  message_count: number
  entity_count: number
  created_at: string
  updated_at: string
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TopicsPage() {
  const [pluginStatus, setPluginStatus] = useState<PluginStatus>('checking')
  const [refreshing, setRefreshing] = useState(false)
  const [topics, setTopics] = useState<ClawTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

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

  const fetchTopics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${CLAW_API}/claw/topics?page_size=100`, {
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) return
      const data = (await res.json()) as { topics: ClawTopic[] }
      setTopics(data.topics ?? [])
    } catch {
      // plugin down
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    await checkHealth(true)
    await fetchTopics()
  }, [checkHealth, fetchTopics])

  useEffect(() => {
    void checkHealth()
    void fetchTopics()
  }, [checkHealth, fetchTopics])

  const handleDelete = useCallback(
    async (id: string) => {
      if (confirmDeleteId !== id) {
        setConfirmDeleteId(id)
        return
      }
      setDeletingId(id)
      setConfirmDeleteId(null)
      try {
        await fetch(`${CLAW_API}/claw/topics/${id}`, { method: 'DELETE' })
        setTopics((prev) => prev.filter((t) => t.id !== id))
      } catch {
        // ignore
      } finally {
        setDeletingId(null)
      }
    },
    [confirmDeleteId],
  )

  const filtered = topics.filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Topics</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Auto-detected conversation topics
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          placeholder="Search topics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2 pr-4 pl-9 text-sm text-zinc-200 placeholder-zinc-500 focus:border-sky-500/50 focus:outline-none"
        />
      </div>

      {/* Topic list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 py-16">
          <Tag className="h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">
            {search ? 'No topics match your search' : 'No topics yet'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/40">
          {filtered.map((topic) => (
            <div
              key={topic.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 shrink-0 text-sky-400" />
                  <span className="truncate text-sm font-medium text-zinc-200">
                    {topic.name}
                  </span>
                  <span className="hidden text-xs text-zinc-600 sm:block">
                    {topic.slug}
                  </span>
                </div>
                <p className="mt-0.5 pl-6 text-xs text-zinc-500">
                  {topic.message_count.toLocaleString()} messages ·{' '}
                  {topic.entity_count.toLocaleString()} entities · updated{' '}
                  {timeAgo(topic.updated_at)}
                </p>
              </div>
              <button
                onClick={() => void handleDelete(topic.id)}
                disabled={deletingId === topic.id}
                className={`ml-3 shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  confirmDeleteId === topic.id
                    ? 'border border-red-500/40 bg-red-900/20 text-red-400 hover:bg-red-900/40'
                    : 'border border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-red-500/40 hover:text-red-400'
                } disabled:opacity-40`}
              >
                {deletingId === topic.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : confirmDeleteId === topic.id ? (
                  'Confirm'
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <p className="text-right text-xs text-zinc-600">
          {filtered.length} topic{filtered.length !== 1 ? 's' : ''}
          {search ? ` matching "${search}"` : ''}
        </p>
      )}
    </div>
  )
}
