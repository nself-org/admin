'use client'

import type {
  ActionType,
  ExecuteWorkflowInput,
  Workflow,
  WorkflowExecution,
  WorkflowExecutionStatus,
  WorkflowStats,
  WorkflowStatus,
} from '@/types/workflow'
import { useCallback, useState } from 'react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'

// ============================================================================
// Fetcher utilities
// ============================================================================

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch')
  return data.data
}

async function postFetcher<T>(url: string, { arg }: { arg: T }): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Request failed')
  return data.data
}

async function putFetcher<T>(url: string, { arg }: { arg: T }): Promise<unknown> {
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Request failed')
  return data.data
}

async function deleteFetcher(url: string): Promise<void> {
  const response = await fetch(url, { method: 'DELETE' })
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Request failed')
}

// ============================================================================
// Types
// ============================================================================

export interface WorkflowListOptions {
  tenantId?: string
  status?: WorkflowStatus
}

export interface ExecutionListOptions {
  status?: WorkflowExecutionStatus
  limit?: number
  offset?: number
}

export interface CreateWorkflowInput {
  name: string
  description?: string
  tenantId?: string
  triggers?: Workflow['triggers']
  actions?: Workflow['actions']
  connections?: Workflow['connections']
  variables?: Workflow['variables']
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  timeout?: number
  maxConcurrency?: number
}

export interface UpdateWorkflowInput {
  name?: string
  description?: string
  triggers?: Workflow['triggers']
  actions?: Workflow['actions']
  connections?: Workflow['connections']
  variables?: Workflow['variables']
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  errorHandler?: Workflow['errorHandler']
  timeout?: number
  maxConcurrency?: number
}

export interface ActionTemplate {
  type: ActionType
  name: string
  description: string
  category: string
  icon?: string
  defaultConfig: Record<string, unknown>
  configSchema: Record<string, unknown>
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch and manage a list of workflows
 */
export function useWorkflows(options?: WorkflowListOptions) {
  const queryParams = new URLSearchParams()
  if (options?.tenantId) queryParams.set('tenantId', options.tenantId)
  if (options?.status) queryParams.set('status', options.status)
  const queryString = queryParams.toString()
  const url = `/api/workflows${queryString ? `?${queryString}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<Workflow[]>(url, fetcher, {
    refreshInterval: 30000,
  })

  return {
    workflows: data ?? [],
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    refresh: mutate,
  }
}

/**
 * Hook to fetch a single workflow by ID
 */
export function useWorkflow(id?: string) {
  const { data, error, isLoading, mutate } = useSWR<Workflow>(
    id ? `/api/workflows/${id}` : null,
    fetcher,
    { refreshInterval: 10000 }
  )

  return {
    workflow: data,
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    refresh: mutate,
  }
}

/**
 * Hook to fetch workflow executions
 */
export function useWorkflowExecutions(workflowId?: string, options?: ExecutionListOptions) {
  const queryParams = new URLSearchParams()
  if (workflowId) queryParams.set('workflowId', workflowId)
  if (options?.status) queryParams.set('status', options.status)
  if (options?.limit) queryParams.set('limit', options.limit.toString())
  if (options?.offset) queryParams.set('offset', options.offset.toString())
  const queryString = queryParams.toString()
  const url = `/api/workflows/executions${queryString ? `?${queryString}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<{
    executions: WorkflowExecution[]
    total: number
  }>(url, fetcher, { refreshInterval: 5000 })

  return {
    executions: data?.executions ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    refresh: mutate,
  }
}

/**
 * Hook to fetch a single workflow execution by ID
 */
export function useWorkflowExecution(executionId?: string) {
  const { data, error, isLoading, mutate } = useSWR<WorkflowExecution>(
    executionId ? `/api/workflows/executions/${executionId}` : null,
    fetcher,
    { refreshInterval: 2000 }
  )

  return {
    execution: data,
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    refresh: mutate,
  }
}

/**
 * Hook to fetch workflow statistics
 */
export function useWorkflowStats() {
  const { data, error, isLoading, mutate } = useSWR<WorkflowStats>(
    '/api/workflows/stats',
    fetcher,
    { refreshInterval: 30000 }
  )

  return {
    stats: data,
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    refresh: mutate,
  }
}

/**
 * Hook to fetch action templates for the workflow builder
 */
export function useActionTemplates(category?: string) {
  const url = category
    ? `/api/workflows/templates?category=${encodeURIComponent(category)}`
    : '/api/workflows/templates'

  const { data, error, isLoading, mutate } = useSWR<ActionTemplate[]>(url, fetcher, {
    refreshInterval: 60000,
  })

  return {
    templates: data ?? [],
    isLoading,
    isError: !!error,
    error: error?.message ?? null,
    refresh: mutate,
  }
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a new workflow
 */
export function useCreateWorkflow() {
  const [error, setError] = useState<string | null>(null)

  const { trigger, isMutating } = useSWRMutation(
    '/api/workflows',
    postFetcher<CreateWorkflowInput>,
    {
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Failed to create workflow')
      },
    }
  )

  const create = useCallback(
    async (input: CreateWorkflowInput): Promise<Workflow> => {
      setError(null)
      const result = await trigger(input)
      return result as Workflow
    },
    [trigger]
  )

  return {
    create,
    isLoading: isMutating,
    error,
  }
}

/**
 * Hook to update an existing workflow
 */
export function useUpdateWorkflow(workflowId?: string) {
  const [error, setError] = useState<string | null>(null)

  const { trigger, isMutating } = useSWRMutation(
    workflowId ? `/api/workflows/${workflowId}` : null,
    putFetcher<UpdateWorkflowInput>,
    {
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Failed to update workflow')
      },
    }
  )

  const update = useCallback(
    async (input: UpdateWorkflowInput): Promise<Workflow> => {
      if (!workflowId) throw new Error('No workflow ID provided')
      setError(null)
      const result = await trigger(input)
      return result as Workflow
    },
    [workflowId, trigger]
  )

  return {
    update,
    isLoading: isMutating,
    error,
  }
}

/**
 * Hook to delete a workflow
 */
export function useDeleteWorkflow() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = useCallback(async (workflowId: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      await deleteFetcher(`/api/workflows/${workflowId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete workflow'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    remove,
    isLoading,
    error,
  }
}

/**
 * Hook to activate a workflow
 */
export function useActivateWorkflow() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activate = useCallback(async (workflowId: string): Promise<Workflow> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/workflows/${workflowId}/activate`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to activate workflow')
      return data.data as Workflow
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate workflow'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    activate,
    isLoading,
    error,
  }
}

/**
 * Hook to pause a workflow
 */
export function usePauseWorkflow() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pause = useCallback(async (workflowId: string): Promise<Workflow> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/workflows/${workflowId}/pause`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to pause workflow')
      return data.data as Workflow
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pause workflow'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    pause,
    isLoading,
    error,
  }
}

/**
 * Hook to execute a workflow
 */
export function useExecuteWorkflow() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (input: ExecuteWorkflowInput): Promise<WorkflowExecution> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/workflows/${input.workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: input.input,
          variables: input.variables,
          async: input.async,
        }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to execute workflow')
      return data.data as WorkflowExecution
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to execute workflow'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    execute,
    isLoading,
    error,
  }
}

/**
 * Hook to cancel a workflow execution
 */
export function useCancelExecution() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = useCallback(async (executionId: string): Promise<WorkflowExecution> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/workflows/executions/${executionId}/cancel`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to cancel execution')
      return data.data as WorkflowExecution
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel execution'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    cancel,
    isLoading,
    error,
  }
}

/**
 * Hook to duplicate a workflow
 */
export function useDuplicateWorkflow() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const duplicate = useCallback(async (workflowId: string, newName?: string): Promise<Workflow> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/workflows/${workflowId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to duplicate workflow')
      return data.data as Workflow
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate workflow'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    duplicate,
    isLoading,
    error,
  }
}

/**
 * Hook to archive a workflow
 */
export function useArchiveWorkflow() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const archive = useCallback(async (workflowId: string): Promise<Workflow> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/workflows/${workflowId}/archive`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to archive workflow')
      return data.data as Workflow
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive workflow'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    archive,
    isLoading,
    error,
  }
}
