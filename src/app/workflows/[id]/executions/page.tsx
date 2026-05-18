'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { WorkflowExecutionList } from '@/components/workflows'
import { useWorkflow, useWorkflowExecution } from '@/hooks/useWorkflows'
import type { WorkflowExecution, WorkflowExecutionStep } from '@/types/workflow'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import * as React from 'react'

const stepStatusIcons: Record<WorkflowExecutionStep['status'], React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-zinc-400" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  skipped: <RefreshCw className="h-4 w-4 text-zinc-400" />,
}

export default function WorkflowExecutionsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const workflowId = params.id as string
  const highlightedId = searchParams.get('highlight')

  const { workflow, isLoading: workflowLoading } = useWorkflow(workflowId)
  const [selectedExecution, setSelectedExecution] = React.useState<WorkflowExecution | null>(null)

  const { execution: executionDetails, isLoading: executionLoading } = useWorkflowExecution(
    selectedExecution?.id
  )

  const handleExecutionClick = (execution: WorkflowExecution) => {
    setSelectedExecution(execution)
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  if (workflowLoading) {
    return (
      <>
        <PageHeader
          title="Loading..."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Workflows', href: '/workflows' },
            { label: 'Loading...' },
          ]}
        />
        <PageContent>
          <Skeleton className="h-[600px] w-full" />
        </PageContent>
      </>
    )
  }

  if (!workflow) {
    return (
      <>
        <PageHeader
          title="Workflow Not Found"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Workflows', href: '/workflows' },
            { label: 'Error' },
          ]}
        />
        <PageContent>
          <Card className="p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load workflow</p>
            </div>
            <Link href="/workflows" className="mt-4 inline-block">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Workflows
              </Button>
            </Link>
          </Card>
        </PageContent>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`${workflow.name} - Executions`}
        description="View execution history and details"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Workflows', href: '/workflows' },
          { label: workflow.name, href: `/workflows/${workflowId}` },
          { label: 'Executions' },
        ]}
        actions={
          <Link href={`/workflows/${workflowId}`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Editor
            </Button>
          </Link>
        }
      />

      <PageContent>
        <div className="flex gap-6">
          {/* Execution List */}
          <div className="flex-1">
            <WorkflowExecutionList
              workflowId={workflowId}
              onExecutionClick={handleExecutionClick}
            />
          </div>

          {/* Execution Details Sidebar */}
          <div className="w-[400px] shrink-0">
            {selectedExecution ? (
              <Card className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    Execution Details
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedExecution(null)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>

                {executionLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : executionDetails ? (
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">Status:</span>
                      <Badge
                        className={
                          executionDetails.status === 'completed'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : executionDetails.status === 'failed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : executionDetails.status === 'running'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                        }
                      >
                        {executionDetails.status === 'running' && (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        )}
                        {executionDetails.status === 'completed' && (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        )}
                        {executionDetails.status === 'failed' && (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {executionDetails.status.charAt(0).toUpperCase() +
                          executionDetails.status.slice(1)}
                      </Badge>
                    </div>

                    {/* Execution Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">ID:</span>
                        <span className="font-mono text-xs">{executionDetails.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Trigger:</span>
                        <span className="capitalize">{executionDetails.triggerType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Started:</span>
                        <span>{formatTimestamp(executionDetails.startedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Completed:</span>
                        <span>{formatTimestamp(executionDetails.completedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400">Duration:</span>
                        <span className="font-mono">
                          {formatDuration(executionDetails.duration)}
                        </span>
                      </div>
                    </div>

                    {/* Error Message */}
                    {executionDetails.error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                        <p className="mb-1 text-sm font-medium text-red-700 dark:text-red-400">
                          Error
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-300">
                          {executionDetails.error}
                        </p>
                      </div>
                    )}

                    {/* Steps */}
                    {executionDetails.steps && executionDetails.steps.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          Steps
                        </h4>
                        <div className="space-y-2">
                          {executionDetails.steps.map((step, index) => (
                            <div
                              key={step.actionId}
                              className="flex items-center gap-2 rounded-md border bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900"
                            >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium dark:bg-zinc-700">
                                {index + 1}
                              </span>
                              {stepStatusIcons[step.status]}
                              <span className="flex-1 truncate text-sm">{step.actionName}</span>
                              <span className="font-mono text-xs text-zinc-500">
                                {formatDuration(step.duration)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Input/Output */}
                    {executionDetails.input !== undefined && (
                      <div>
                        <h4 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          Input
                        </h4>
                        <pre className="max-h-32 overflow-auto rounded-md bg-zinc-100 p-2 font-mono text-xs dark:bg-zinc-800">
                          {String(JSON.stringify(executionDetails.input, null, 2))}
                        </pre>
                      </div>
                    )}

                    {executionDetails.output !== undefined && (
                      <div>
                        <h4 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          Output
                        </h4>
                        <pre className="max-h-32 overflow-auto rounded-md bg-zinc-100 p-2 font-mono text-xs dark:bg-zinc-800">
                          {String(JSON.stringify(executionDetails.output, null, 2))}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Failed to load execution details
                  </p>
                )}
              </Card>
            ) : (
              <Card className="border-dashed p-6 text-center">
                <Play className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Select an execution from the list to view details
                </p>
                {highlightedId && (
                  <p className="mt-2 text-xs text-blue-500">
                    New execution {highlightedId.slice(0, 8)} was just started
                  </p>
                )}
              </Card>
            )}
          </div>
        </div>
      </PageContent>
    </>
  )
}
