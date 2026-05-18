'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { WorkflowActionConfig, WorkflowCanvas, WorkflowTriggerConfig } from '@/components/workflows'
import {
  useActivateWorkflow,
  useDeleteWorkflow,
  useExecuteWorkflow,
  usePauseWorkflow,
  useUpdateWorkflow,
  useWorkflow,
} from '@/hooks/useWorkflows'
import type { WorkflowAction, WorkflowConnection, WorkflowTrigger } from '@/types/workflow'
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  History,
  Loader2,
  Pause,
  Play,
  Save,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import * as React from 'react'

type SidebarMode = 'triggers' | 'action' | null

export default function WorkflowEditorPage() {
  const params = useParams()
  const router = useRouter()
  const workflowId = params.id as string

  const { workflow, isLoading, isError, error, refresh } = useWorkflow(workflowId)
  const { update, isLoading: isUpdating, error: updateError } = useUpdateWorkflow(workflowId)
  const { activate, isLoading: isActivating } = useActivateWorkflow()
  const { pause, isLoading: isPausing } = usePauseWorkflow()
  const { execute, isLoading: isExecuting } = useExecuteWorkflow()
  const { remove, isLoading: isDeleting } = useDeleteWorkflow()

  const [localTriggers, setLocalTriggers] = React.useState<WorkflowTrigger[]>([])
  const [localActions, setLocalActions] = React.useState<WorkflowAction[]>([])
  const [localConnections, setLocalConnections] = React.useState<WorkflowConnection[]>([])
  const [selectedAction, setSelectedAction] = React.useState<WorkflowAction | null>(null)
  const [sidebarMode, setSidebarMode] = React.useState<SidebarMode>('triggers')
  const [hasChanges, setHasChanges] = React.useState(false)

  // Sync local state when workflow loads
  React.useEffect(() => {
    if (workflow) {
      setLocalTriggers(workflow.triggers || [])
      setLocalActions(workflow.actions || [])
      setLocalConnections(workflow.connections || [])
    }
  }, [workflow])

  // Track changes
  React.useEffect(() => {
    if (!workflow) return

    const triggersChanged = JSON.stringify(localTriggers) !== JSON.stringify(workflow.triggers)
    const actionsChanged = JSON.stringify(localActions) !== JSON.stringify(workflow.actions)
    const connectionsChanged =
      JSON.stringify(localConnections) !== JSON.stringify(workflow.connections)

    setHasChanges(triggersChanged || actionsChanged || connectionsChanged)
  }, [workflow, localTriggers, localActions, localConnections])

  const handleSave = async () => {
    try {
      await update({
        triggers: localTriggers,
        actions: localActions,
        connections: localConnections,
      })
      setHasChanges(false)
      refresh()
    } catch (_err) {
      // Error is handled by the hook
    }
  }

  const handleActivate = async () => {
    try {
      await activate(workflowId)
      refresh()
    } catch (_err) {
      // Error is handled by the hook
    }
  }

  const handlePause = async () => {
    try {
      await pause(workflowId)
      refresh()
    } catch (_err) {
      // Error is handled by the hook
    }
  }

  const handleExecute = async () => {
    try {
      const execution = await execute({ workflowId })
      router.push(`/workflows/${workflowId}/executions?highlight=${execution.id}`)
    } catch (_err) {
      // Error is handled by the hook
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return
    }

    try {
      await remove(workflowId)
      router.push('/workflows')
    } catch (_err) {
      // Error is handled by the hook
    }
  }

  const handleActionSelect = (action: WorkflowAction) => {
    setSelectedAction(action)
    setSidebarMode('action')
  }

  const handleActionUpdate = (updatedAction: WorkflowAction) => {
    setLocalActions((prev) => prev.map((a) => (a.id === updatedAction.id ? updatedAction : a)))
    setSelectedAction(updatedAction)
  }

  const handleActionMove = (actionId: string, position: { x: number; y: number }) => {
    setLocalActions((prev) => prev.map((a) => (a.id === actionId ? { ...a, position } : a)))
  }

  const handleActionDelete = (actionId: string) => {
    setLocalActions((prev) => prev.filter((a) => a.id !== actionId))
    setLocalConnections((prev) =>
      prev.filter((c) => c.sourceId !== actionId && c.targetId !== actionId)
    )
    if (selectedAction?.id === actionId) {
      setSelectedAction(null)
      setSidebarMode('triggers')
    }
  }

  const handleConnectionCreate = (connection: Omit<WorkflowConnection, 'id'>) => {
    const newConnection: WorkflowConnection = {
      ...connection,
      id: `conn-${Date.now()}`,
    }
    setLocalConnections((prev) => [...prev, newConnection])
  }

  const handleConnectionDelete = (connectionId: string) => {
    setLocalConnections((prev) => prev.filter((c) => c.id !== connectionId))
  }

  const handleAddAction = () => {
    const newAction: WorkflowAction = {
      id: `action-${Date.now()}`,
      type: 'http_request',
      name: 'New Action',
      config: {},
      position: {
        x: 100 + localActions.length * 50,
        y: 100 + localActions.length * 50,
      },
    }
    setLocalActions((prev) => [...prev, newAction])
    setSelectedAction(newAction)
    setSidebarMode('action')
  }

  if (isLoading) {
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
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[600px] w-full" />
          </div>
        </PageContent>
      </>
    )
  }

  if (isError || !workflow) {
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
              <p>{error || 'Failed to load workflow'}</p>
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

  const isProcessing = isUpdating || isActivating || isPausing || isDeleting

  return (
    <>
      <PageHeader
        title={workflow.name}
        description={workflow.description || 'Edit workflow configuration'}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Workflows', href: '/workflows' },
          { label: workflow.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/workflows/${workflowId}/executions`}>
              <Button variant="outline" size="sm">
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
            </Link>

            {workflow.status === 'active' ? (
              <Button variant="outline" size="sm" onClick={handlePause} disabled={isProcessing}>
                {isPausing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="mr-2 h-4 w-4" />
                )}
                Pause
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleActivate} disabled={isProcessing}>
                {isActivating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Activate
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExecute}
              disabled={isProcessing || isExecuting}
            >
              {isExecuting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run Now
            </Button>

            <Button onClick={handleSave} disabled={!hasChanges || isProcessing} size="sm">
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
              onClick={handleDelete}
              disabled={isProcessing}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        }
      />

      {updateError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <p className="font-medium">Failed to save changes</p>
          <p className="text-sm">{updateError}</p>
        </div>
      )}

      <PageContent>
        <div className="flex gap-6">
          {/* Canvas Area */}
          <div className="min-h-[600px] flex-1">
            <WorkflowCanvas
              actions={localActions}
              connections={localConnections}
              onActionSelect={handleActionSelect}
              onActionMove={handleActionMove}
              onActionDelete={handleActionDelete}
              onConnectionCreate={handleConnectionCreate}
              onConnectionDelete={handleConnectionDelete}
              onAddAction={handleAddAction}
            />
          </div>

          {/* Sidebar */}
          <div className="w-[400px] shrink-0 space-y-4">
            {/* Sidebar Toggle */}
            <div className="flex gap-2">
              <Button
                variant={sidebarMode === 'triggers' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSidebarMode('triggers')
                  setSelectedAction(null)
                }}
                className="flex-1"
              >
                Triggers
              </Button>
              <Button
                variant={sidebarMode === 'action' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSidebarMode('action')}
                className="flex-1"
                disabled={!selectedAction}
              >
                Action Config
              </Button>
            </div>

            {/* Sidebar Content */}
            {sidebarMode === 'triggers' && (
              <WorkflowTriggerConfig triggers={localTriggers} onChange={setLocalTriggers} />
            )}

            {sidebarMode === 'action' && selectedAction && (
              <WorkflowActionConfig
                action={selectedAction}
                onChange={handleActionUpdate}
                onClose={() => {
                  setSelectedAction(null)
                  setSidebarMode('triggers')
                }}
              />
            )}

            {sidebarMode === 'action' && !selectedAction && (
              <Card className="border-dashed p-6 text-center">
                <Archive className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Select an action on the canvas to configure it
                </p>
              </Card>
            )}
          </div>
        </div>
      </PageContent>
    </>
  )
}
