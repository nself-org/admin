'use client'

import type {
  GenerateReportInput,
  ReportExecution,
  ReportSchedule,
  ReportStats,
  ReportTemplate,
} from '@/types/report'
import { useCallback, useState } from 'react'
import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'

// ============================================================================
// Fetcher Functions (using API endpoints instead of direct lib imports)
// ============================================================================

const fetcher = async <T>(url: string): Promise<T> => {
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

async function deleteFetcher(url: string): Promise<void> {
  const response = await fetch(url, { method: 'DELETE' })
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Request failed')
}

// ============================================================================
// Types
// ============================================================================

export interface GetReportExecutionsOptions {
  status?: string
  limit?: number
  offset?: number
}

export interface CreateReportTemplateInput {
  name: string
  description?: string
  category: string
  format: 'pdf' | 'csv' | 'xlsx' | 'html' | 'json'
  query: string
  columns: Array<{
    key: string
    label: string
    type: string
    format?: string
  }>
  parameters?: Array<{
    name: string
    type: string
    label: string
    required?: boolean
    default?: unknown
  }>
}

export interface UpdateReportTemplateInput {
  name?: string
  description?: string
  category?: string
  format?: 'pdf' | 'csv' | 'xlsx' | 'html' | 'json'
  query?: string
  columns?: Array<{
    key: string
    label: string
    type: string
    format?: string
  }>
  parameters?: Array<{
    name: string
    type: string
    label: string
    required?: boolean
    default?: unknown
  }>
  isActive?: boolean
}

export interface CreateScheduleInput {
  frequency: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly'
  dayOfWeek?: number
  dayOfMonth?: number
  time: string
  timezone: string
  format: 'pdf' | 'csv' | 'xlsx' | 'html' | 'json' | 'excel'
  recipients: string[]
  enabled: boolean
}

export interface UpdateScheduleInput {
  frequency?: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly'
  dayOfWeek?: number
  dayOfMonth?: number
  time?: string
  timezone?: string
  format?: 'pdf' | 'csv' | 'xlsx' | 'html' | 'json' | 'excel'
  recipients?: string[]
  enabled?: boolean
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch all report templates, optionally filtered by category
 */
export function useReportTemplates(category?: string) {
  const queryParams = new URLSearchParams()
  if (category) queryParams.set('category', category)
  const queryString = queryParams.toString()
  const url = `/api/reports/templates${queryString ? `?${queryString}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<ReportTemplate[]>(url, fetcher, {
    refreshInterval: 30000,
  })

  return {
    templates: data ?? [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Fetch a single report template by ID
 */
export function useReportTemplate(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ReportTemplate>(
    id ? `/api/reports/templates/${id}` : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  return {
    template: data,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Fetch report executions, optionally filtered by reportId and options
 */
export function useReportExecutions(reportId?: string, options?: GetReportExecutionsOptions) {
  const queryParams = new URLSearchParams()
  if (reportId) queryParams.set('reportId', reportId)
  if (options?.status) queryParams.set('status', options.status)
  if (options?.limit) queryParams.set('limit', options.limit.toString())
  if (options?.offset) queryParams.set('offset', options.offset.toString())
  const queryString = queryParams.toString()
  const url = `/api/reports/executions${queryString ? `?${queryString}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<ReportExecution[]>(url, fetcher, {
    refreshInterval: 10000,
  })

  return {
    executions: data ?? [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Fetch a single report execution by ID
 */
export function useReportExecution(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ReportExecution>(
    id ? `/api/reports/executions/${id}` : null,
    fetcher,
    { refreshInterval: 5000 } // Poll more frequently for execution status
  )

  return {
    execution: data,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Fetch schedules for a specific report
 */
export function useReportSchedules(reportId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ReportSchedule[]>(
    reportId ? `/api/reports/schedules?reportId=${reportId}` : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  return {
    schedules: data ?? [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Fetch report statistics
 */
export function useReportStats() {
  const { data, error, isLoading, mutate } = useSWR<ReportStats>('/api/reports/stats', fetcher, {
    refreshInterval: 60000,
  })

  return {
    stats: data,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Generate a report from a template
 */
export function useGenerateReport() {
  const [error, setError] = useState<string | null>(null)

  const { trigger, isMutating, data, reset } = useSWRMutation<
    ReportExecution,
    Error,
    string,
    GenerateReportInput
  >('/api/reports/generate', async (url, { arg }) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(arg),
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || 'Failed to generate')
    return result.data
  })

  const generate = useCallback(
    async (input: GenerateReportInput) => {
      setError(null)
      try {
        return await trigger(input)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate report'
        setError(message)
        throw err
      }
    },
    [trigger]
  )

  return {
    generate,
    execution: data,
    isGenerating: isMutating,
    error,
    reset,
  }
}

/**
 * Download a report by execution ID
 * Returns a function that triggers the download
 */
export function useDownloadReport() {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = useCallback(async (executionId: string, filename?: string) => {
    setIsDownloading(true)
    setError(null)
    try {
      const response = await fetch(`/api/reports/executions/${executionId}/download`)
      if (!response.ok) {
        throw new Error('Failed to download report')
      }
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `report-${executionId}`

      // Trigger download
      document.body.appendChild(link)
      link.click()

      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download report'
      setError(message)
      throw err
    } finally {
      setIsDownloading(false)
    }
  }, [])

  return {
    download,
    isDownloading,
    error,
    reset: () => setError(null),
  }
}

/**
 * Create a new report template
 */
export function useCreateReportTemplate() {
  const [error, setError] = useState<string | null>(null)

  const { trigger, isMutating, data, reset } = useSWRMutation(
    '/api/reports/templates',
    postFetcher<CreateReportTemplateInput>
  )

  const create = useCallback(
    async (input: CreateReportTemplateInput) => {
      setError(null)
      try {
        return (await trigger(input)) as ReportTemplate
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create template'
        setError(message)
        throw err
      }
    },
    [trigger]
  )

  return {
    create,
    template: data as ReportTemplate | undefined,
    isCreating: isMutating,
    error,
    reset,
  }
}

/**
 * Update an existing report template
 */
export function useUpdateReportTemplate() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (id: string, updates: UpdateReportTemplateInput) => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await fetch(`/api/reports/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to update')
      return data.data as ReportTemplate
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update template'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return {
    update,
    isUpdating,
    error,
    reset: () => setError(null),
  }
}

/**
 * Delete a report template
 */
export function useDeleteReportTemplate() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteTemplate = useCallback(async (id: string) => {
    setIsDeleting(true)
    setError(null)
    try {
      await deleteFetcher(`/api/reports/templates/${id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template'
      setError(message)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return {
    deleteTemplate,
    isDeleting,
    error,
    reset: () => setError(null),
  }
}

/**
 * Create a schedule for a report
 */
export function useCreateSchedule() {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (reportId: string, schedule: CreateScheduleInput) => {
    setIsCreating(true)
    setError(null)
    try {
      const response = await fetch(`/api/reports/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, ...schedule }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to create')
      return data.data as ReportSchedule
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create schedule'
      setError(message)
      throw err
    } finally {
      setIsCreating(false)
    }
  }, [])

  return {
    create,
    isCreating,
    error,
    reset: () => setError(null),
  }
}

/**
 * Update a schedule
 */
export function useUpdateSchedule() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (scheduleId: string, updates: UpdateScheduleInput) => {
    setIsUpdating(true)
    setError(null)
    try {
      const response = await fetch(`/api/reports/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to update')
      return data.data as ReportSchedule
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update schedule'
      setError(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return {
    update,
    isUpdating,
    error,
    reset: () => setError(null),
  }
}

/**
 * Delete a schedule
 */
export function useDeleteSchedule() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteSchedule = useCallback(async (scheduleId: string) => {
    setIsDeleting(true)
    setError(null)
    try {
      await deleteFetcher(`/api/reports/schedules/${scheduleId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete schedule'
      setError(message)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return {
    deleteSchedule,
    isDeleting,
    error,
    reset: () => setError(null),
  }
}
