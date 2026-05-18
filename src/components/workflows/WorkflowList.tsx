'use client'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkflows } from '@/hooks/useWorkflows'
import { Plus, Workflow } from 'lucide-react'
import { WorkflowCard } from './WorkflowCard'

interface WorkflowListProps {
  onCreateClick?: () => void
  onEditClick?: (workflowId: string) => void
}

export function WorkflowList({ onCreateClick, onEditClick }: WorkflowListProps) {
  const { workflows, isLoading, isError, error } = useWorkflows()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        <p className="font-medium">Failed to load workflows</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Workflows</h3>
        <Button onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No workflows yet"
          description="Create your first workflow to automate tasks and processes"
          action={{
            label: 'Create Workflow',
            onClick: onCreateClick ?? (() => {}),
          }}
        />
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onEdit={() => onEditClick?.(workflow.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
