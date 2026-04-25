'use client'

import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const CLAW_API = 'http://127.0.0.1:3710'

// ── Types ──────────────────────────────────────────────────────────────────────

type PluginStatus = 'checking' | 'running' | 'stopped'

type EntityType =
  | 'person'
  | 'place'
  | 'organization'
  | 'event'
  | 'concept'
  | 'product'
  | string

interface ClawEntity {
  id: string
  name: string
  entity_type: EntityType
  description?: string
  confidence: number
  mention_count: number
  topic_ids: string[]
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

const ENTITY_TYPE_COLORS: Record<string, string> = {
  person: 'border-violet-500/30 bg-violet-900/20 text-violet-300',
  place: 'border-emerald-500/30 bg-emerald-900/20 text-emerald-300',
  organization: 'border-sky-500/30 bg-sky-900/20 text-sky-300',
  event: 'border-amber-500/30 bg-amber-900/20 text-amber-300',
  concept: 'border-pink-500/30 bg-pink-900/20 text-pink-300',
  product: 'border-orange-500/30 bg-orange-900/20 text-orange-300',
}

function entityTypeColor(type: EntityType): string {
  return (
    ENTITY_TYPE_COLORS[type] ??
    'border-zinc-600/50 bg-zinc-800/50 text-zinc-400'
  )
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

// ── Entity type filter ────────────────────────────────────────────────────────

const ALL_TYPES: EntityType[] = [
  'person',
  'place',
  'organization',
  'event',
  'concept',
  'product',
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EntitiesPage() {
  const [pluginStatus, setPluginStatus] = useState<PluginStatus>('checking')
  const [refreshing, setRefreshing] = useState(false)
  const [entities, setEntities] = useState<ClawEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<EntityType | 'all'>('all')
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

  const fetchEntities = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${CLAW_API}/claw/entities?page_size=200`, {
        signal: AbortSignal.timeout(8_000),
      })
      if (!res.ok) return
      const data = (await res.json()) as { entities: ClawEntity[] }
      setEntities(data.entities ?? [])
    } catch {
      // plugin down
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    await checkHealth(true)
    await fetchEntities()
  }, [checkHealth, fetchEntities])

  useEffect(() => {
    void checkHealth()
    void fetchEntities()
  }, [checkHealth, fetchEntities])

  const handleDelete = useCallback(
    async (id: string) => {
      if (confirmDeleteId !== id) {
        setConfirmDeleteId(id)
        return
      }
      setDeletingId(id)
      setConfirmDeleteId(null)
      try {
        await fetch(`${CLAW_API}/claw/entities/${id}`, { method: 'DELETE' })
        setEntities((prev) => prev.filter((e) => e.id !== id))
      } catch {
        // ignore
      } finally {
        setDeletingId(null)
      }
    },
    [confirmDeleteId],
  )

  const filtered = entities.filter((e) => {
    if (typeFilter !== 'all' && e.entity_type !== typeFilter) return false
    if (
      search &&
      !e.name.toLowerCase().includes(search.toLowerCase()) &&
      !e.entity_type.toLowerCase().includes(search.toLowerCase())
    )
      return false
    return true
  })

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Entities</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            People, places, and concepts extracted from conversations
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            placeholder="Search entities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2 pr-4 pl-9 text-sm text-zinc-200 placeholder-zinc-500 focus:border-sky-500/50 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTypeFilter('all')}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              typeFilter === 'all'
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            All
          </button>
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                typeFilter === t
                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Entity list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 py-16">
          <Globe className="h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">
            {search || typeFilter !== 'all'
              ? 'No entities match your filters'
              : 'No entities yet'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/40">
          {filtered.map((entity) => (
            <div
              key={entity.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-zinc-200">
                    {entity.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs capitalize ${entityTypeColor(entity.entity_type)}`}
                  >
                    {entity.entity_type}
                  </span>
                </div>
                {entity.description && (
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {entity.description}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-zinc-600">
                  {entity.mention_count} mention
                  {entity.mention_count !== 1 ? 's' : ''} ·{' '}
                  {Math.round(entity.confidence * 100)}% confidence · updated{' '}
                  {timeAgo(entity.updated_at)}
                </p>
              </div>
              <button
                onClick={() => void handleDelete(entity.id)}
                disabled={deletingId === entity.id}
                className={`ml-3 shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  confirmDeleteId === entity.id
                    ? 'border border-red-500/40 bg-red-900/20 text-red-400 hover:bg-red-900/40'
                    : 'border border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-red-500/40 hover:text-red-400'
                } disabled:opacity-40`}
              >
                {deletingId === entity.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : confirmDeleteId === entity.id ? (
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
          {filtered.length} entit{filtered.length !== 1 ? 'ies' : 'y'}
        </p>
      )}
    </div>
  )
}
