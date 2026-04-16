'use client'

import {
  AlertCircle,
  Brain,
  Check,
  ChevronDown,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const CLAW_API = 'http://127.0.0.1:3710'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClawSession {
  id: string
  user_id: string
  name?: string
  context: unknown[]
  tool_calls: unknown[]
  created_at: string
  updated_at: string
  is_admin_mode: boolean
}

interface ClawIdentity {
  id: string
  name: string
  soul: string
  user_profile?: string
  is_active: boolean
  created_at: string
}

interface ClawTool {
  id: string
  slug: string
  description?: string
  enabled: boolean
  is_builtin: boolean
  schema?: Record<string, unknown>
}

type Tab = 'sessions' | 'identities' | 'tools'

// ── Sessions tab ───────────────────────────────────────────────────────────────

function SessionsTab({
  clawDown,
}: {
  clawDown: boolean
  onClawDown: () => void
}) {
  const [sessions, setSessions] = useState<ClawSession[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${CLAW_API}/claw/sessions?page=1&page_size=20`)
      if (!res.ok) return
      const data = (await res.json()) as { sessions: ClawSession[] }
      setSessions(data.sessions ?? [])
    } catch {
      // claw down handled by parent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clawDown) fetchSessions()
  }, [clawDown])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return
    try {
      await fetch(`${CLAW_API}/claw/sessions/${id}`, { method: 'DELETE' })
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 pt-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-12 animate-pulse rounded-xl bg-zinc-800/50"
          />
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="mt-2 flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-14">
        <Users className="mb-3 h-10 w-10 text-zinc-600" />
        <p className="text-sm text-zinc-500">No sessions found.</p>
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-xl border border-zinc-700/50 bg-zinc-800/50">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Updated
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Mode
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.id}
                className="border-b border-zinc-700/50 last:border-0 hover:bg-zinc-800/50"
              >
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {s.id.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 text-sm text-zinc-400">{s.user_id}</td>
                <td className="px-4 py-3 text-sm text-zinc-300">
                  {s.name ?? (
                    <span className="text-zinc-600 italic">Unnamed</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap text-zinc-500">
                  {new Date(s.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap text-zinc-500">
                  {new Date(s.updated_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {s.is_admin_mode && (
                    <span className="rounded-full bg-sky-900/40 px-2 py-0.5 text-xs text-sky-300">
                      admin
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-900/30 hover:text-red-400"
                    title="Delete session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Identities tab ─────────────────────────────────────────────────────────────

function IdentitiesTab({ clawDown }: { clawDown: boolean }) {
  const [identities, setIdentities] = useState<ClawIdentity[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Partial<ClawIdentity>>>(
    {},
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newDraft, setNewDraft] = useState({
    name: '',
    soul: '',
    user_profile: '',
  })

  const fetchIdentities = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${CLAW_API}/claw/identities`)
      if (!res.ok) return
      const data = (await res.json()) as { identities: ClawIdentity[] }
      setIdentities(data.identities ?? [])
    } catch {
      // claw down handled by parent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!clawDown) fetchIdentities()
  }, [clawDown])

  const getDraft = (id: string, field: keyof ClawIdentity, fallback: string) =>
    (drafts[id]?.[field] as string | undefined) ?? fallback

  const setDraftField = (
    id: string,
    field: keyof ClawIdentity,
    value: string,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const handleSave = async (identity: ClawIdentity) => {
    setSaving(identity.id)
    try {
      const body = drafts[identity.id] ?? {}
      await fetch(`${CLAW_API}/claw/identities/${identity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[identity.id]
        return next
      })
      await fetchIdentities()
    } catch {
      // ignore
    } finally {
      setSaving(null)
    }
  }

  const handleActivate = async (id: string) => {
    try {
      await fetch(`${CLAW_API}/claw/identities/${id}/activate`, {
        method: 'POST',
      })
      await fetchIdentities()
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this identity? This cannot be undone.')) return
    try {
      await fetch(`${CLAW_API}/claw/identities/${id}`, { method: 'DELETE' })
      setIdentities((prev) => prev.filter((i) => i.id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch {
      // ignore
    }
  }

  const handleCreate = async () => {
    if (!newDraft.name.trim() || !newDraft.soul.trim()) return
    setSaving('new')
    try {
      await fetch(`${CLAW_API}/claw/identities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDraft),
      })
      setCreatingNew(false)
      setNewDraft({ name: '', soul: '', user_profile: '' })
      await fetchIdentities()
    } catch {
      // ignore
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 pt-2">
        {[1, 2].map((n) => (
          <div
            key={n}
            className="h-16 animate-pulse rounded-xl bg-zinc-800/50"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-3">
      {/* New identity form */}
      {creatingNew ? (
        <div className="space-y-3 rounded-xl border border-sky-500/30 bg-zinc-800/50 p-4">
          <p className="text-sm font-medium text-white">New Identity</p>
          <input
            type="text"
            placeholder="Name"
            value={newDraft.name}
            onChange={(e) =>
              setNewDraft((d) => ({ ...d, name: e.target.value }))
            }
            className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-sky-500/50"
          />
          <textarea
            placeholder="Soul (agent personality / instructions)…"
            value={newDraft.soul}
            onChange={(e) =>
              setNewDraft((d) => ({ ...d, soul: e.target.value }))
            }
            rows={4}
            className="w-full resize-none rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-sky-500/50"
          />
          <textarea
            placeholder="User profile (optional)…"
            value={newDraft.user_profile}
            onChange={(e) =>
              setNewDraft((d) => ({ ...d, user_profile: e.target.value }))
            }
            rows={2}
            className="w-full resize-none rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-sky-500/50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving === 'new'}
              className="flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50"
            >
              {saving === 'new' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatingNew(false)
                setNewDraft({ name: '', soul: '', user_profile: '' })
              }}
              className="flex items-center gap-2 rounded-lg border border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700/50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreatingNew(true)}
          className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
        >
          <Plus className="h-4 w-4" />
          New identity
        </button>
      )}

      {/* Identity list */}
      {identities.length === 0 && !creatingNew && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-14">
          <Brain className="mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-500">No identities configured.</p>
        </div>
      )}

      {identities.map((identity) => {
        const isExpanded = expandedId === identity.id
        const hasDraft =
          drafts[identity.id] && Object.keys(drafts[identity.id]).length > 0

        return (
          <div
            key={identity.id}
            className={`rounded-xl border bg-zinc-800/50 ${
              identity.is_active
                ? 'border-emerald-500/30'
                : 'border-zinc-700/50'
            }`}
          >
            {/* Row header */}
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setExpandedId(isExpanded ? null : identity.id)}
            >
              <div className="flex items-center gap-3">
                {identity.is_active && (
                  <Star className="h-4 w-4 shrink-0 fill-emerald-500 text-emerald-500" />
                )}
                <span className="text-sm font-medium text-white">
                  {identity.name}
                </span>
                {identity.is_active && (
                  <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-300">
                    active
                  </span>
                )}
                {hasDraft && (
                  <span className="rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs text-yellow-400">
                    unsaved
                  </span>
                )}
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Expanded editor */}
            {isExpanded && (
              <div className="space-y-3 border-t border-zinc-700/50 px-4 pt-3 pb-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Name
                  </label>
                  <input
                    type="text"
                    value={getDraft(identity.id, 'name', identity.name)}
                    onChange={(e) =>
                      setDraftField(identity.id, 'name', e.target.value)
                    }
                    aria-label="Identity name"
                    className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Soul
                  </label>
                  <textarea
                    value={getDraft(identity.id, 'soul', identity.soul)}
                    onChange={(e) =>
                      setDraftField(identity.id, 'soul', e.target.value)
                    }
                    rows={6}
                    aria-label="Identity soul"
                    className="w-full resize-none rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    User profile
                  </label>
                  <textarea
                    value={getDraft(
                      identity.id,
                      'user_profile',
                      identity.user_profile ?? '',
                    )}
                    onChange={(e) =>
                      setDraftField(identity.id, 'user_profile', e.target.value)
                    }
                    rows={3}
                    aria-label="User profile"
                    className="w-full resize-none rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSave(identity)}
                    disabled={saving === identity.id || !hasDraft}
                    className="flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50"
                  >
                    {saving === identity.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Edit className="h-4 w-4" />
                    )}
                    Save
                  </button>
                  {!identity.is_active && (
                    <button
                      type="button"
                      onClick={() => handleActivate(identity.id)}
                      className="flex items-center gap-2 rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-900/40"
                    >
                      <Star className="h-4 w-4" />
                      Activate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(identity.id)}
                    className="flex items-center gap-2 rounded-lg border border-red-700/50 bg-red-900/20 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-900/40"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Tools tab ──────────────────────────────────────────────────────────────────

function ToolsTab({ clawDown }: { clawDown: boolean }) {
  const [tools, setTools] = useState<ClawTool[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchTools = async () => {
    try {
      const res = await fetch(`${CLAW_API}/claw/tools`)
      if (!res.ok) return
      const data = (await res.json()) as { tools: ClawTool[] }
      setTools(data.tools ?? [])
    } catch {
      // claw down handled by parent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!clawDown) fetchTools()
  }, [clawDown])

  const handleRefreshTools = async () => {
    setRefreshing(true)
    try {
      await fetch(`${CLAW_API}/claw/tools/refresh`, { method: 'POST' })
      await fetchTools()
    } catch {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 pt-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-12 animate-pulse rounded-xl bg-zinc-800/50"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleRefreshTools}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh tools
        </button>
      </div>

      {tools.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-14">
          <Wrench className="mb-3 h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-500">No tools registered.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <tr
                    key={tool.id}
                    className="border-b border-zinc-700/50 last:border-0 hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3 font-mono text-sm text-zinc-200">
                      {tool.slug}
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-sm text-zinc-400">
                      {tool.description ?? (
                        <span className="text-zinc-600 italic">
                          No description
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {tool.is_builtin ? (
                        <span className="rounded-full bg-zinc-700/60 px-2 py-0.5 text-xs text-zinc-400">
                          built-in
                        </span>
                      ) : (
                        <span className="rounded-full bg-sky-900/40 px-2 py-0.5 text-xs text-sky-300">
                          dynamic
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {tool.enabled ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          enabled
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                          disabled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ClawSessionsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('sessions')
  const [clawDown, setClawDown] = useState(false)
  const [checking, setChecking] = useState(true)

  // Probe claw availability once on mount
  useEffect(() => {
    const probe = async () => {
      try {
        const res = await fetch(`${CLAW_API}/claw/sessions?page=1&page_size=1`)
        setClawDown(!res.ok)
      } catch {
        setClawDown(true)
      } finally {
        setChecking(false)
      }
    }
    probe()
  }, [])

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'sessions', label: 'Sessions', icon: <Users className="h-4 w-4" /> },
    {
      id: 'identities',
      label: 'Identities',
      icon: <Brain className="h-4 w-4" />,
    },
    { id: 'tools', label: 'Tools', icon: <Wrench className="h-4 w-4" /> },
  ]

  if (checking) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Claw Sessions</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-12 animate-pulse rounded-xl bg-zinc-800/50"
            />
          ))}
        </div>
      </div>
    )
  }

  if (clawDown) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Claw Sessions</h1>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">
                nself-claw is not running
              </p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Start the claw plugin to manage sessions, identities, and tools.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Claw Sessions</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage ɳClaw sessions, agent identities, and registered tools
        </p>
      </div>

      {/* Tabs */}
      <div className="flex w-fit gap-1 rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'sessions' && (
        <SessionsTab clawDown={clawDown} onClawDown={() => setClawDown(true)} />
      )}
      {activeTab === 'identities' && <IdentitiesTab clawDown={clawDown} />}
      {activeTab === 'tools' && <ToolsTab clawDown={clawDown} />}
    </div>
  )
}
