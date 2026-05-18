'use client'

import * as Icons from '@/lib/icons'
import { EnvVariable } from './types'

interface EnvVariableRowProps {
  variable: EnvVariable
  editingKey: string | null
  tempValue: string
  showSecrets: boolean
  deleteConfirm: string | null
  onSetEditingKey: (key: string | null) => void
  onSetTempValue: (value: string) => void
  onUpdateVariable: (key: string, value: string) => void
  onDeleteVariable: (key: string) => void
  onCopyToClipboard: (value: string) => void
}

export function EnvVariableRow({
  variable,
  editingKey,
  tempValue,
  showSecrets,
  deleteConfirm,
  onSetEditingKey,
  onSetTempValue,
  onUpdateVariable,
  onDeleteVariable,
  onCopyToClipboard,
}: EnvVariableRowProps) {
  const isEditing = editingKey === variable.key
  const displayValue = variable.value || variable.defaultValue || ''
  const hasValue = !!variable.value
  const isUsingDefault = !hasValue && !!variable.defaultValue
  const isConfirmingDelete = deleteConfirm === variable.key

  if (isEditing) {
    return (
      <tr className="bg-blue-50 dark:bg-blue-950/20">
        <td className="px-3 py-1.5 font-mono text-xs">
          {variable.key}
          {variable.isSecret && <Icons.Lock className="ml-1 inline h-3 w-3 text-zinc-400" />}
        </td>
        <td className="px-3 py-1.5" colSpan={2}>
          <div className="flex items-center gap-1">
            <textarea
              value={tempValue}
              onChange={(e) => onSetTempValue(e.target.value)}
              className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900"
              autoFocus
              rows={tempValue.split('\n').length || 1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onUpdateVariable(variable.key, tempValue)
                  onSetEditingKey(null)
                } else if (e.key === 'Escape') {
                  onSetEditingKey(null)
                }
              }}
            />
            <button
              onClick={() => {
                onUpdateVariable(variable.key, tempValue)
                onSetEditingKey(null)
              }}
              className="rounded bg-green-500 p-1 text-white hover:bg-green-600"
              title="Save"
            >
              <Icons.Check className="h-3 w-3" />
            </button>
            <button
              onClick={() => onSetEditingKey(null)}
              className="rounded bg-zinc-200 p-1 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
              title="Cancel"
            >
              <Icons.X className="h-3 w-3" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr
      className={`group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${
        variable.hasChanges ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''
      }`}
    >
      <td className="px-3 py-1.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
        {variable.key}
        {variable.isSecret && <Icons.Lock className="ml-1 inline h-3 w-3 text-zinc-400" />}
      </td>
      <td className="px-3 py-1.5 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`truncate ${!hasValue ? 'text-zinc-400 italic' : 'text-zinc-600 dark:text-zinc-400'}`}
          >
            {variable.isSecret && !showSecrets
              ? hasValue
                ? '••••••••'
                : 'not set'
              : displayValue || 'not set'}
          </span>
          {isUsingDefault && (
            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              default
            </span>
          )}
          {hasValue && !variable.hasChanges && (
            <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700 dark:bg-green-900/30 dark:text-green-400">
              set
            </span>
          )}
          {variable.hasChanges && (
            <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              modified
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onCopyToClipboard(displayValue)}
            className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Copy value"
          >
            <Icons.Copy className="h-3 w-3 text-zinc-500" />
          </button>
          <button
            onClick={() => {
              onSetEditingKey(variable.key)
              onSetTempValue(variable.value || variable.defaultValue || '')
            }}
            className="rounded p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Edit value"
          >
            <Icons.Edit className="h-3 w-3 text-zinc-500" />
          </button>
          {variable.source === 'env' && (
            <button
              onClick={() => onDeleteVariable(variable.key)}
              className={`rounded p-0.5 ${
                isConfirmingDelete
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title={isConfirmingDelete ? 'Click again to confirm delete' : 'Delete'}
            >
              <Icons.Trash2
                className={`h-3 w-3 ${isConfirmingDelete ? 'text-red-600' : 'text-red-500'}`}
              />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
