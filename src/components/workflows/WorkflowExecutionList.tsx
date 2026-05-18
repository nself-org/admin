'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCancelExecution, useWorkflowExecutions } from '@/hooks/useWorkflows'
import type { TriggerType, WorkflowExecution, WorkflowExecutionStatus } from '@/types/workflow'
import {
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Globe,
  History,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Square,
  Webhook,
  XCircle,
  Zap,
} from 'lucide-react'
import * as React from 'react'

interface WorkflowExecutionListProps {
  workflowId?: string
  onExecutionClick?: (execution: WorkflowExecution) => void
}

const statusConfig: Record<
  WorkflowExecutionStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  pending: {
    label: 'Pending',
    icon: <Clock className="h-3.5 w-3.5" />,
    className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
  running: {
    label: 'Running',
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  failed: {
    label: 'Failed',
    icon: <XCircle className="h-3.5 w-3.5" />,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Square className="h-3.5 w-3.5" />,
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  timeout: {
    label: 'Timeout',
    icon: <Clock className="h-3.5 w-3.5" />,
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
}

const triggerIcons: Record<TriggerType, React.ReactNode> = {
  manual: <Play className="h-3.5 w-3.5" />,
  schedule: <Calendar className="h-3.5 w-3.5" />,
  webhook: <Webhook className="h-3.5 w-3.5" />,
  event: <Zap className="h-3.5 w-3.5" />,
  api: <Globe className="h-3.5 w-3.5" />,
  condition: <RefreshCw className="h-3.5 w-3.5" />,
  workflow: <RefreshCw className="h-3.5 w-3.5" />,
}

export function WorkflowExecutionList({
  workflowId,
  onExecutionClick,
}: WorkflowExecutionListProps) {
  const { executions, isLoading, isError, error, refresh } = useWorkflowExecutions(workflowId)
  const { cancel } = useCancelExecution()
  const [cancellingId, setCancellingId] = React.useState<string | null>(null)

  const handleCancel = async (executionId: string) => {
    setCancellingId(executionId)
    try {
      await cancel(executionId)
      refresh()
    } catch (_error) {
      // Error handled by hook
    } finally {
      setCancellingId(null)
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="rounded-lg border dark:border-zinc-800">
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        <p className="font-medium">Failed to load executions</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Execution History</h3>
        <Button variant="outline" size="sm" onClick={() => refresh()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {executions.length === 0 ? (
        <EmptyState
          icon={History}
          title="No executions yet"
          description="Run the workflow to see execution history here"
        />
      ) : (
        <div className="rounded-lg border dark:border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Execution ID</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => {
                const status = statusConfig[execution.status]
                return (
                  <TableRow
                    key={execution.id}
                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    onClick={() => onExecutionClick?.(execution)}
                  >
                    <TableCell className="font-mono text-xs">
                      {execution.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {triggerIcons[execution.triggerType]}
                        <span className="capitalize">{execution.triggerType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`flex w-fit items-center gap-1 ${status.className}`}>
                        {status.icon}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDuration(execution.duration)}
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500 dark:text-zinc-400">
                      {formatTimestamp(execution.startedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            onExecutionClick?.(execution)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(execution.status === 'pending' || execution.status === 'running') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancel(execution.id)
                            }}
                            disabled={cancellingId === execution.id}
                          >
                            {cancellingId === execution.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
