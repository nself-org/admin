'use client'

import { cn } from '@/lib/utils'
import type { ActionType, WorkflowAction } from '@/types/workflow'
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Clock,
  Code,
  Database,
  Edit,
  GitBranch,
  Globe,
  Mail,
  MessageSquare,
  RefreshCw,
  Terminal,
  Trash2,
  Variable,
  Workflow,
} from 'lucide-react'
import * as React from 'react'

interface WorkflowNodeProps {
  action: WorkflowAction
  selected?: boolean
  onSelect?: () => void
  onDelete?: () => void
  onDragStart?: () => void
  onPortDragStart?: (port: string) => void
  onPortDrop?: (port: string) => void
}

const actionIcons: Record<ActionType, React.ReactNode> = {
  http_request: <Globe className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  notification: <Bell className="h-4 w-4" />,
  slack: <MessageSquare className="h-4 w-4" />,
  database_query: <Database className="h-4 w-4" />,
  run_command: <Terminal className="h-4 w-4" />,
  transform_data: <Code className="h-4 w-4" />,
  condition: <GitBranch className="h-4 w-4" />,
  loop: <RefreshCw className="h-4 w-4" />,
  delay: <Clock className="h-4 w-4" />,
  parallel: <ArrowRight className="h-4 w-4" />,
  set_variable: <Variable className="h-4 w-4" />,
  log: <Terminal className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
  workflow: <Workflow className="h-4 w-4" />,
}

const actionColors: Record<ActionType, string> = {
  http_request: 'bg-blue-500',
  email: 'bg-green-500',
  notification: 'bg-yellow-500',
  slack: 'bg-sky-500',
  database_query: 'bg-orange-500',
  run_command: 'bg-zinc-500',
  transform_data: 'bg-cyan-500',
  condition: 'bg-sky-500',
  loop: 'bg-pink-500',
  delay: 'bg-amber-500',
  parallel: 'bg-teal-500',
  set_variable: 'bg-emerald-500',
  log: 'bg-slate-500',
  error: 'bg-red-500',
  workflow: 'bg-blue-500',
}

export function WorkflowNode({
  action,
  selected,
  onSelect,
  onDelete,
  onDragStart,
  onPortDragStart,
  onPortDrop,
}: WorkflowNodeProps) {
  const [showActions, setShowActions] = React.useState(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    onDragStart?.()
  }

  const handleInputPortMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onPortDrop?.('input')
  }

  const handleOutputPortMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onPortDragStart?.('output')
  }

  return (
    <div
      className={cn(
        'absolute w-[200px] cursor-move rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950',
        selected && 'ring-2 ring-blue-500',
      )}
      style={{
        left: action.position.x,
        top: action.position.y,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onSelect?.()}
    >
      {/* Input port */}
      <div
        className="absolute top-1/2 -left-2 h-4 w-4 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-zinc-300 bg-white transition-colors hover:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
        onMouseDown={handleInputPortMouseDown}
      />

      {/* Output port */}
      <div
        className="absolute top-1/2 -right-2 h-4 w-4 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-zinc-300 bg-white transition-colors hover:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
        onMouseDown={handleOutputPortMouseDown}
      />

      {/* Node content */}
      <div className="p-3">
        <div className="mb-2 flex items-center gap-2">
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded text-white',
              actionColors[action.type],
            )}
          >
            {actionIcons[action.type]}
          </div>
          <span className="flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {action.name}
          </span>
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          <span className="capitalize">{action.type.replace(/_/g, ' ')}</span>
          {action.timeout && (
            <span className="ml-2 text-zinc-400 dark:text-zinc-500">
              {action.timeout}ms timeout
            </span>
          )}
        </div>
      </div>

      {/* Hover actions */}
      <div
        className={cn(
          'absolute -top-2 -right-2 flex gap-1 transition-opacity',
          showActions ? 'opacity-100' : 'opacity-0',
        )}
      >
        <button
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-zinc-500 shadow-md hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          onClick={(e) => {
            e.stopPropagation()
            onSelect?.()
          }}
        >
          <Edit className="h-3 w-3" />
        </button>
        <button
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-zinc-500 shadow-md hover:text-red-500 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-red-400"
          onClick={(e) => {
            e.stopPropagation()
            onDelete?.()
          }}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
