'use client'

import {
  Loader2,
  Save,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RuleConditions {
  from?: string
  subject_contains?: string
  body_contains?: string
}

export type ActionType =
  | 'silent_trash'
  | 'leave_inbox'
  | 'label'
  | 'telegram_notify'
  | 'ai_summarize'
  | 'claw_delegate'
  | 'forward'
  | 'mark_read'
  | 'calendar_sync'
  | 'store_only'

export interface MuxRule {
  id?: string
  name: string
  priority: number
  conditions: RuleConditions
  action: ActionType
  action_config?: Record<string, unknown>
  enabled: boolean
  cooldown_secs?: number
  created_at?: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ACTION_OPTIONS: { value: ActionType; label: string }[] = [
  { value: 'silent_trash', label: 'Silent Trash' },
  { value: 'leave_inbox', label: 'Leave in Inbox' },
  { value: 'label', label: 'Apply Label' },
  { value: 'telegram_notify', label: 'Telegram Notify' },
  { value: 'ai_summarize', label: 'AI Summarize' },
  { value: 'claw_delegate', label: 'Claw Delegate' },
  { value: 'forward', label: 'Forward' },
  { value: 'mark_read', label: 'Mark Read' },
  { value: 'calendar_sync', label: 'Calendar Sync' },
  { value: 'store_only', label: 'Store Only' },
]

const FIELD_OPTIONS = [
  { value: 'from', label: 'From' },
  { value: 'subject_contains', label: 'Subject contains' },
  { value: 'body_contains', label: 'Body contains' },
]

const OPERATOR_OPTIONS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'regex', label: 'Regex' },
]

const INPUT =
  'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none'

const SELECT =
  'rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none'

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-zinc-400">
      {children}
    </label>
  )
}

// ── Condition Row ──────────────────────────────────────────────────────────────

interface ConditionRow {
  field: string
  operator: string
  value: string
}

function ConditionRowEditor({
  condition,
  onChange,
  onRemove,
}: {
  condition: ConditionRow
  onChange: (c: ConditionRow) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        title="Condition field"
        className={`${SELECT} w-36`}
        value={condition.field}
        onChange={(e) => onChange({ ...condition, field: e.target.value })}
      >
        {FIELD_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        title="Operator"
        className={`${SELECT} w-32`}
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
      >
        {OPERATOR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <input
        className={`${INPUT} flex-1`}
        value={condition.value}
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
        placeholder="Value..."
      />

      <button
        type="button"
        onClick={onRemove}
        className="rounded p-1 text-zinc-500 hover:text-red-400"
        title="Remove condition"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ── RuleBuilder ──────────────────────────────────────────────────────────────

export interface RuleBuilderProps {
  initial?: Partial<MuxRule>
  onSave: (rule: MuxRule) => Promise<void>
  onCancel: () => void
  saving?: boolean
}

export function RuleBuilder({
  initial,
  onSave,
  onCancel,
  saving = false,
}: RuleBuilderProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [priority, setPriority] = useState(initial?.priority ?? 100)
  const [action, setAction] = useState<ActionType>(
    initial?.action ?? 'leave_inbox',
  )
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [cooldownSecs, setCooldownSecs] = useState<number | undefined>(
    initial?.cooldown_secs,
  )
  const [logicMode, setLogicMode] = useState<'AND' | 'OR'>('AND')

  // Parse initial conditions into rows
  const initialConditions: ConditionRow[] = []
  if (initial?.conditions) {
    const c = initial.conditions
    if (c.from) {
      initialConditions.push({
        field: 'from',
        operator: 'contains',
        value: c.from,
      })
    }
    if (c.subject_contains) {
      initialConditions.push({
        field: 'subject_contains',
        operator: 'contains',
        value: c.subject_contains,
      })
    }
    if (c.body_contains) {
      initialConditions.push({
        field: 'body_contains',
        operator: 'contains',
        value: c.body_contains,
      })
    }
  }
  if (initialConditions.length === 0) {
    initialConditions.push({ field: 'from', operator: 'contains', value: '' })
  }
  const [conditions, setConditions] =
    useState<ConditionRow[]>(initialConditions)

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: 'from', operator: 'contains', value: '' },
    ])
  }

  const updateCondition = (idx: number, c: ConditionRow) => {
    const next = [...conditions]
    next[idx] = c
    setConditions(next)
  }

  const removeCondition = (idx: number) => {
    if (conditions.length <= 1) return
    setConditions(conditions.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Build conditions object from rows
    const conds: RuleConditions = {}
    for (const row of conditions) {
      if (!row.value.trim()) continue
      if (row.field === 'from') conds.from = row.value
      if (row.field === 'subject_contains')
        conds.subject_contains = row.value
      if (row.field === 'body_contains') conds.body_contains = row.value
    }

    const rule: MuxRule = {
      ...(initial?.id ? { id: initial.id } : {}),
      name,
      priority,
      conditions: conds,
      action,
      enabled,
      cooldown_secs: cooldownSecs,
      created_at: initial?.created_at,
    }

    await onSave(rule)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5"
    >
      {/* Name and priority */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Rule name</Label>
          <input
            required
            className={INPUT}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Forward billing emails"
          />
        </div>

        <div>
          <Label>Priority (lower = runs first)</Label>
          <input
            type="number"
            title="Rule priority"
            className={INPUT}
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value) || 100)}
            min={1}
          />
        </div>

        <div>
          <Label>Cooldown (seconds, optional)</Label>
          <input
            type="number"
            className={INPUT}
            value={cooldownSecs ?? ''}
            onChange={(e) =>
              setCooldownSecs(
                e.target.value ? parseInt(e.target.value) : undefined,
              )
            }
            placeholder="300"
            min={0}
          />
        </div>
      </div>

      {/* Conditions */}
      <div className="space-y-3 rounded-lg border border-zinc-700/50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Conditions
          </p>
          <div className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 p-0.5 text-xs">
            <button
              type="button"
              className={`rounded px-2 py-0.5 ${
                logicMode === 'AND'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
              onClick={() => setLogicMode('AND')}
            >
              AND
            </button>
            <button
              type="button"
              className={`rounded px-2 py-0.5 ${
                logicMode === 'OR'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
              onClick={() => setLogicMode('OR')}
            >
              OR
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {conditions.map((c, idx) => (
            <div key={idx}>
              {idx > 0 && (
                <p className="mb-1 text-center text-xs font-medium text-indigo-400">
                  {logicMode}
                </p>
              )}
              <ConditionRowEditor
                condition={c}
                onChange={(next) => updateCondition(idx, next)}
                onRemove={() => removeCondition(idx)}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addCondition}
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
        >
          <span className="text-lg leading-none">+</span> Add condition
        </button>
      </div>

      {/* Action */}
      <div>
        <Label>Action</Label>
        <select
          title="Action type"
          className={`${SELECT} w-full`}
          value={action}
          onChange={(e) => setAction(e.target.value as ActionType)}
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {/* Enabled toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="rule-enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500"
        />
        <label
          htmlFor="rule-enabled"
          className="cursor-pointer text-sm text-zinc-300"
        >
          Enabled
        </label>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-2 border-t border-zinc-700/50 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Saving...' : initial?.id ? 'Update Rule' : 'Create Rule'}
        </button>
      </div>
    </form>
  )
}
