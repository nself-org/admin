'use client'

import { RuleBuilder, type MuxRule } from '@/components/rules/RuleBuilder'
import { RuleList } from '@/components/rules/RuleList'
import { AlertCircle, Loader2, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// ── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = '/api/plugins/mux/rules'

async function fetchRules(): Promise<MuxRule[]> {
  const res = await fetch(API_BASE)
  if (!res.ok) throw new Error('mux-down')
  const data = (await res.json()) as { rules: Array<Record<string, unknown>> }
  return (data.rules ?? []).map(parseRule)
}

function parseRule(raw: Record<string, unknown>): MuxRule {
  // Determine action type from the raw action object
  let actionType: MuxRule['action'] = 'store_only'
  const rawAction = raw.action as Record<string, unknown> | undefined
  const rawActions = raw.actions as Record<string, unknown>[] | undefined

  if (rawAction) {
    const keys = Object.keys(rawAction).filter((k) => k !== '_when')
    if (keys.length > 0) actionType = keys[0] as MuxRule['action']
  } else if (rawActions && rawActions.length > 0) {
    const keys = Object.keys(rawActions[0]).filter((k) => k !== '_when')
    if (keys.length > 0) actionType = keys[0] as MuxRule['action']
  }

  return {
    id: raw.id as string,
    name: raw.name as string,
    priority: raw.priority as number,
    conditions: (raw.conditions ?? {}) as MuxRule['conditions'],
    action: actionType,
    enabled: raw.enabled as boolean,
    cooldown_secs: raw.cooldown_secs ? Number(raw.cooldown_secs) : undefined,
    created_at: raw.created_at as string,
  }
}

async function saveRule(rule: MuxRule): Promise<void> {
  // Build the action payload in the format mux expects
  const actionPayload: Record<string, unknown> = {
    [rule.action]: rule.action_config ?? {},
  }

  const payload: Record<string, unknown> = {
    name: rule.name,
    priority: rule.priority,
    conditions: rule.conditions,
    action: actionPayload,
    enabled: rule.enabled,
    cooldown_secs: rule.cooldown_secs ?? undefined,
  }

  if (rule.id) {
    // Update existing
    await fetch(API_BASE, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rule.id, ...payload }),
    })
  } else {
    // Create new
    await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }
}

async function deleteRule(id: string): Promise<void> {
  await fetch(`${API_BASE}?id=${id}`, { method: 'DELETE' })
}

async function toggleEnabled(rule: MuxRule): Promise<void> {
  await fetch(API_BASE, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
  })
}

// ── Page component ──────────────────────────────────────────────────────────

export default function RulesPage() {
  const [rules, setRules] = useState<MuxRule[]>([])
  const [loading, setLoading] = useState(true)
  const [muxDown, setMuxDown] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<MuxRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchRules()
      setRules(data)
      setMuxDown(false)
    } catch {
      setMuxDown(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
  }

  const handleSave = async (rule: MuxRule) => {
    setSaving(true)
    try {
      await saveRule(rule)
      setShowForm(false)
      setEditingRule(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteRule(id)
    await load()
  }

  const handleToggleEnabled = async (rule: MuxRule) => {
    await toggleEnabled(rule)
    await load()
  }

  const handleEdit = (rule: MuxRule) => {
    setEditingRule(rule)
    setShowForm(true)
  }

  const handleAdd = () => {
    setEditingRule(null)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingRule(null)
  }

  // Mux service offline
  if (!loading && muxDown) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Rules</h1>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">
                nself-mux is not running
              </p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Install and start the mux plugin to manage email routing rules.
              </p>
              <pre className="mt-3 rounded-lg bg-zinc-900/80 px-4 py-3 font-mono text-sm text-zinc-300">
                nself plugin install mux{'\n'}nself start
              </pre>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Rules</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage email routing rules for the mux plugin
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && !muxDown && rules.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Total rules',
              value: rules.length,
              color: 'text-white',
            },
            {
              label: 'Enabled',
              value: rules.filter((r) => r.enabled).length,
              color: 'text-emerald-400',
            },
            {
              label: 'Disabled',
              value: rules.filter((r) => !r.enabled).length,
              color: 'text-zinc-400',
            },
            {
              label: 'Avg priority',
              value: Math.round(
                rules.reduce((sum, r) => sum + r.priority, 0) / rules.length,
              ),
              color: 'text-indigo-400',
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4"
            >
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Form (create/edit) */}
      {showForm && (
        <RuleBuilder
          initial={editingRule ?? undefined}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
        />
      )}

      {/* Rule list */}
      <RuleList
        rules={rules}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleEnabled={handleToggleEnabled}
      />
    </div>
  )
}
