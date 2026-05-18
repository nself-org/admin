'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useActivateWorkflow, useDeleteWorkflow, usePauseWorkflow } from '@/hooks/useWorkflows'
import type { Workflow, WorkflowStatus } from '@/types/workflow'
import { Calendar, Clock, Edit, Globe, Pause, Play, Trash2, Webhook, Zap } from 'lucide-react'
import * as React from 'react'

interface WorkflowCardProps {
  workflow: Workflow
  onEdit?: () => void
  onDelete?: () => void
}

const statusConfig: Record<
  WorkflowStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  paused: { label: 'Paused', variant: 'outline' },
  archived: { label: 'Archived', variant: 'destructive' },
}

const triggerIcons: Record<string, React.ReactNode> = {
  manual: <Play className="h-3 w-3" />,
  schedule: <Calendar className="h-3 w-3" />,
  webhook: <Webhook className="h-3 w-3" />,
  event: <Zap className="h-3 w-3" />,
  api: <Globe className="h-3 w-3" />,
}

export function WorkflowCard({ workflow, onEdit, onDelete }: WorkflowCardProps) {
  const [showActions, setShowActions] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const { activate, isLoading: isActivating } = useActivateWorkflow()
  const { pause, isLoading: isPausing } = usePauseWorkflow()
  const { remove, isLoading: isDeleting } = useDeleteWorkflow()

  const status = statusConfig[workflow.status]
  const primaryTrigger = workflow.triggers[0]

  const handleActivate = async () => {
    try {
      await activate(workflow.id)
    } catch (_error) {
      // Error is handled by the hook
    }
  }

  const handlePause = async () => {
    try {
      await pause(workflow.id)
    } catch (_error) {
      // Error is handled by the hook
    }
  }

  const handleDelete = async () => {
    try {
      await remove(workflow.id)
      onDelete?.()
    } catch (_error) {
      // Error is handled by the hook
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <>
      <Card
        className="group relative transition-shadow hover:shadow-md"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">{workflow.name}</CardTitle>
              {workflow.description && (
                <CardDescription className="line-clamp-2">{workflow.description}</CardDescription>
              )}
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Trigger summary */}
          <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            {primaryTrigger && (
              <div className="flex items-center gap-1.5">
                {triggerIcons[primaryTrigger.type] || <Zap className="h-3 w-3" />}
                <span className="capitalize">{primaryTrigger.type}</span>
                {primaryTrigger.config.cron && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    ({primaryTrigger.config.cron})
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>Updated {formatDate(workflow.updatedAt)}</span>
            </div>
          </div>

          {/* Actions info */}
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span>
              {workflow.actions.length} action
              {workflow.actions.length !== 1 ? 's' : ''}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span>v{workflow.version}</span>
          </div>

          {/* Action buttons */}
          <div
            className={`flex items-center gap-2 transition-opacity ${
              showActions ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>

            {workflow.status === 'active' ? (
              <Button variant="outline" size="sm" onClick={handlePause} disabled={isPausing}>
                <Pause className="mr-1.5 h-3.5 w-3.5" />
                {isPausing ? 'Pausing...' : 'Pause'}
              </Button>
            ) : workflow.status !== 'archived' ? (
              <Button variant="outline" size="sm" onClick={handleActivate} disabled={isActivating}>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                {isActivating ? 'Activating...' : 'Activate'}
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Workflow"
        description={`Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmText="Delete"
        confirmVariant="destructive"
        loading={isDeleting}
      />
    </>
  )
}
