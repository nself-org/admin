'use client'

import {
  AlertCircle,
  Brain,
  Loader2,
  Pin,
  PinOff,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

const CLAW_API = 'http://127.0.0.1:3710'
const PINNED_KEY = 'claw_pinned_memories'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClawMemory {
  id: string
  entity_id: string
  entity_type: string
  content: string
  confidence: number
  times_reinforced: number
  source: 'extracted' | 'explicit' | string
  context_hash?: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  similarity?: number
}

interface MemoryStats {
  count: number
  oldest_entry: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPinned(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(PINNED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function savePinned(pins: Set<string>): void {
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify([...pins]))
  } catch {
    // ignore
  }
}

function SourceBadge({ source }: { source: string }) {
  const isExplicit = source === 'explicit'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isExplicit
          ? 'bg-indigo-900/40 text-indigo-300'
          : 'bg-zinc-700/60 text-zinc-400'
      }`}
    >
      {source}
    </span>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  const color =
    pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-700">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-500">{pct}%</span>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ClawMemoryPage() {
  const [memories, setMemories] = useState<ClawMemory[]>([])
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [clawDown, setClawDown] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load pinned from localStorage on mount
  useEffect(() => {
    setPinned(getPinned())
  }, [])

  const fetchMemories = useCallback(async (searchQ?: string) => {
    try {
      const url = searchQ
        ? `${CLAW_API}/claw/memory/search?q=${encodeURIComponent(searchQ)}`
        : `${CLAW_API}/claw/memories?user_id=admin`

      const res = await fetch(url)
      if (!res.ok) {
        setClawDown(true)
        return
      }
      const data = (await res.json()) as { memories: ClawMemory[] } | ClawMemory[]
      const list = Array.isArray(data) ? data : (data.memories ?? [])
      setMemories(list)
      setClawDown(false)
    } catch {
      setClawDown(true)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${CLAW_API}/claw/memories/stats?user_id=admin`)
      if (res.ok) {
        const data = (await res.json()) as MemoryStats
        setStats(data)
      }
    } catch {
      // stats are non-critical
    }
  }, [])

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchMemories(), fetchStats()])
    setLoading(false)
    setRefreshing(false)
  }, [fetchMemories, fetchStats])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      fetchMemories()
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      await fetchMemories(query.trim())
      setSearching(false)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, fetchMemories])

  const handleRefresh = async () => {
    setRefreshing(true)
    setQuery('')
    await fetchAll()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this memory? This cannot be undone.')) return
    try {
      await fetch(`${CLAW_API}/claw/memories/${id}`, { method: 'DELETE' })
      setMemories((prev) => prev.filter((m) => m.id !== id))
      // Remove from pinned if present
      if (pinned.has(id)) {
        const next = new Set(pinned)
        next.delete(id)
        setPinned(next)
        savePinned(next)
      }
      await fetchStats()
    } catch {
      // ignore
    }
  }

  const handleClearAll = async () => {
    if (
      !window.confirm(
        'Delete ALL memories for user "admin"? This cannot be undone.',
      )
    )
      return
    if (!window.confirm('Are you absolutely sure? All memories will be lost.'))
      return
    try {
      await fetch(`${CLAW_API}/claw/memories?user_id=admin`, {
        method: 'DELETE',
      })
      setMemories([])
      setPinned(new Set())
      savePinned(new Set())
      setStats(null)
    } catch {
      // ignore
    }
  }

  const togglePin = (id: string) => {
    const next = new Set(pinned)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setPinned(next)
    savePinned(next)
  }

  if (!loading && clawDown) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Claw Memory</h1>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">
                nself-claw is not running
              </p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Start the claw plugin to view memory entries.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Sort: pinned items first, then by created_at desc
  const sorted = [...memories].sort((a, b) => {
    const ap = pinned.has(a.id) ? 0 : 1
    const bp = pinned.has(b.id) ? 0 : 1
    if (ap !== bp) return ap - bp
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Claw Memory</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Persistent memory entries for the ɳClaw agent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-2 rounded-lg border border-red-700/50 bg-red-900/20 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-900/40 disabled:opacity-50"
            disabled={memories.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </button>
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
      </div>

      {/* Stats bar */}
      {!loading && stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            {
              label: 'Total memories',
              value: stats.count,
              color: 'text-white',
            },
            {
              label: 'Pinned',
              value: pinned.size,
              color: 'text-indigo-400',
            },
            {
              label: 'Oldest entry',
              value: stats.oldest_entry
                ? new Date(stats.oldest_entry).toLocaleDateString()
                : '—',
              color: 'text-zinc-400',
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4"
            >
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search memories…"
          className="w-full rounded-xl border border-zinc-700/50 bg-zinc-800/50 py-2.5 pl-10 pr-10 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
        />
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-24 animate-pulse rounded-xl bg-zinc-800/50"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <Brain className="mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-500">
            {query ? 'No memories match your search.' : 'No memories stored yet.'}
          </p>
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Memory cards */}
      {!loading && sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((memory) => {
            const isPinned = pinned.has(memory.id)
            return (
              <div
                key={memory.id}
                className={`rounded-xl border bg-zinc-800/50 p-4 transition-colors ${
                  isPinned
                    ? 'border-indigo-500/40'
                    : 'border-zinc-700/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Content */}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm leading-relaxed text-zinc-200">
                      {memory.content}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <SourceBadge source={memory.source} />
                      <ConfidenceBar value={memory.confidence} />
                      {memory.times_reinforced > 0 && (
                        <span className="text-xs text-zinc-500">
                          ×{memory.times_reinforced} reinforced
                        </span>
                      )}
                      {memory.similarity !== undefined && (
                        <span className="text-xs text-emerald-400">
                          {Math.round(memory.similarity * 100)}% match
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                      <span className="font-mono">{memory.entity_id}</span>
                      <span>·</span>
                      <span>{new Date(memory.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      title={isPinned ? 'Unpin' : 'Pin'}
                      onClick={() => togglePin(memory.id)}
                      className={`rounded-lg p-1.5 transition-colors ${
                        isPinned
                          ? 'text-indigo-400 hover:bg-indigo-900/30'
                          : 'text-zinc-600 hover:bg-zinc-700/50 hover:text-zinc-400'
                      }`}
                    >
                      {isPinned ? (
                        <Pin className="h-4 w-4" />
                      ) : (
                        <PinOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Delete memory"
                      onClick={() => handleDelete(memory.id)}
                      className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-900/30 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
