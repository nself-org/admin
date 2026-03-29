'use client'

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Edit2,
  GripVertical,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import type { ActionType, MuxRule } from './RuleBuilder'

// ── Action label map ──────────────────────────────────────────────────────────

const ACTION_LABELS: Record<ActionType, string> = {
  silent_trash: 'Silent Trash',
  leave_inbox: 'Leave in Inbox',
  label: 'Apply Label',
  telegram_notify: 'Telegram Notify',
  ai_summarize: 'AI Summarize',
  claw_delegate: 'Claw Delegate',
  forward: 'Forward',
  mark_read: 'Mark Read',
  calendar_sync: 'Calendar Sync',
  store_only: 'Store Only',
}

// ── Condition summary ─────────────────────────────────────────────────────────

function conditionSummary(conditions: MuxRule['conditions']): string {
  const parts: string[] = []
  if (conditions.from) parts.push(`from: ${conditions.from}`)
  if (conditions.subject_contains)
    parts.push(`subject: ${conditions.subject_contains}`)
  if (conditions.body_contains) parts.push(`body: ${conditions.body_contains}`)
  if (parts.length === 0) return 'any message'
  return parts.join(' + ')
}

// ── RuleList ──────────────────────────────────────────────────────────────────

export interface RuleListProps {
  rules: MuxRule[]
  loading?: boolean
  onEdit: (rule: MuxRule) => void
  onDelete: (ruleId: string) => Promise<void>
  onToggleEnabled: (rule: MuxRule) => Promise<void>
  onReorder?: (ruleId: string, direction: 'up' | 'down') => void
}

export function RuleList({
  rules,
  loading = false,
  onEdit,
  onDelete,
  onToggleEnabled,
  onReorder,
}: RuleListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-16 animate-pulse rounded-xl bg-zinc-800/50"
          />
        ))}
      </div>
    )
  }

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-12">
        <AlertCircle className="mb-3 h-8 w-8 text-zinc-600" />
        <p className="text-sm text-zinc-500">No rules configured</p>
        <p className="mt-1 text-xs text-zinc-600">
          Create a rule to start routing emails automatically.
        </p>
      </div>
    )
  }

  const sorted = [...rules].sort((a, b) => a.priority - b.priority)

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
            <tr>
              <th className="w-8 px-2 py-3" />
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Conditions
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Cooldown
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((rule, idx) => (
              <tr
                key={rule.id ?? idx}
                className="border-b border-zinc-700/50 last:border-0 hover:bg-zinc-800/70"
              >
                {/* Drag handle / reorder */}
                <td className="px-2 py-3">
                  {onReorder && rule.id && (
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => onReorder(rule.id!, 'up')}
                        className="rounded p-0.5 text-zinc-500 hover:text-white disabled:opacity-20"
                        title="Move up"
                      >
                        <GripVertical className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </td>

                {/* Priority */}
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-zinc-300">
                    {rule.priority}
                  </span>
                </td>

                {/* Name */}
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-white">
                    {rule.name || '(unnamed)'}
                  </span>
                </td>

                {/* Conditions summary */}
                <td className="max-w-[200px] px-4 py-3">
                  <span className="truncate text-xs text-zinc-400">
                    {conditionSummary(rule.conditions)}
                  </span>
                </td>

                {/* Action */}
                <td className="px-4 py-3">
                  <span className="rounded-full bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-300">
                    {ACTION_LABELS[rule.action] ?? rule.action}
                  </span>
                </td>

                {/* Enabled toggle */}
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onToggleEnabled(rule)}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                  >
                    {rule.enabled ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-400">
                        <XCircle className="h-3.5 w-3.5" />
                        Disabled
                      </span>
                    )}
                  </button>
                </td>

                {/* Cooldown */}
                <td className="px-4 py-3 text-sm text-zinc-400">
                  {rule.cooldown_secs ? (
                    <span className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {rule.cooldown_secs}s
                    </span>
                  ) : (
                    <span className="text-zinc-600">&mdash;</span>
                  )}
                </td>

                {/* Edit / Delete */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(rule)}
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700/50 hover:text-white"
                      aria-label={`Edit ${rule.name}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {deleteConfirm === rule.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (rule.id) {
                              void onDelete(rule.id)
                              setDeleteConfirm(null)
                            }
                          }}
                          className="rounded px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-900/30"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => rule.id && setDeleteConfirm(rule.id)}
                        className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700/50 hover:text-red-400"
                        aria-label={`Delete ${rule.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
