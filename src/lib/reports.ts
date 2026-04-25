// Reports API library for nself-admin
// This module provides functions for managing report templates, executions, and schedules

import {
  GenerateReportInput,
  ReportExecution,
  ReportFormat,
  ReportSchedule,
  ReportStats,
  ReportStatus,
  ReportTemplate,
} from '@/types/report'

// ============================================================================
// Type Exports (for useReports hook compatibility)
// ============================================================================

export type CreateReportTemplateInput = Omit<
  ReportTemplate,
  'id' | 'createdAt' | 'updatedAt'
>

export type UpdateReportTemplateInput = Partial<
  Omit<ReportTemplate, 'id' | 'createdAt'>
>

export type CreateScheduleInput = Omit<
  ReportSchedule,
  'id' | 'reportId' | 'lastRun' | 'nextRun'
>

export type UpdateScheduleInput = Partial<Omit<ReportSchedule, 'id'>>

export type GetReportExecutionsOptions = {
  status?: ReportStatus
  limit?: number
  offset?: number
}

// In-memory storage for development (replace with database in production)
const templates: Map<string, ReportTemplate> = new Map()
const executions: Map<string, ReportExecution> = new Map()
const schedules: Map<string, ReportSchedule> = new Map()

// Helper to generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// Template Operations
// ============================================================================

export async function getTemplates(
  tenantId?: string,
): Promise<ReportTemplate[]> {
  const allTemplates = Array.from(templates.values())
  if (tenantId) {
    return allTemplates.filter((t) => !t.tenantId || t.tenantId === tenantId)
  }
  return allTemplates
}

export async function getTemplate(id: string): Promise<ReportTemplate | null> {
  return templates.get(id) || null
}

export async function createTemplate(
  data: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ReportTemplate> {
  const now = new Date().toISOString()
  const template: ReportTemplate = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  }
  templates.set(template.id, template)
  return template
}

export async function updateTemplate(
  id: string,
  data: Partial<Omit<ReportTemplate, 'id' | 'createdAt'>>,
): Promise<ReportTemplate | null> {
  const existing = templates.get(id)
  if (!existing) {
    return null
  }
  const updated: ReportTemplate = {
    ...existing,
    ...data,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }
  templates.set(id, updated)
  return updated
}

export async function deleteTemplate(id: string): Promise<boolean> {
  return templates.delete(id)
}

// ============================================================================
// Execution Operations
// ============================================================================

export async function getExecutions(options?: {
  reportId?: string
  status?: ReportStatus
  limit?: number
  offset?: number
}): Promise<ReportExecution[]> {
  let results = Array.from(executions.values())

  if (options?.reportId) {
    results = results.filter((e) => e.reportId === options.reportId)
  }
  if (options?.status) {
    results = results.filter((e) => e.status === options.status)
  }

  // Sort by startedAt descending
  results.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )

  if (options?.offset) {
    results = results.slice(options.offset)
  }
  if (options?.limit) {
    results = results.slice(0, options.limit)
  }

  return results
}

export async function getExecution(
  id: string,
): Promise<ReportExecution | null> {
  return executions.get(id) || null
}

export async function generateReport(
  input: GenerateReportInput,
): Promise<ReportExecution> {
  const template = await getTemplate(input.templateId)
  if (!template) {
    throw new Error(`Template not found: ${input.templateId}`)
  }

  const execution: ReportExecution = {
    id: generateId(),
    reportId: input.templateId,
    status: 'pending',
    format: input.format,
    filters: input.filters,
    parameters: input.parameters,
    startedAt: new Date().toISOString(),
    createdBy: 'system', // In production, get from auth context
  }

  executions.set(execution.id, execution)

  // Simulate async report generation
  processReportGeneration(execution.id, template, input)

  return execution
}

async function processReportGeneration(
  executionId: string,
  _template: ReportTemplate,
  input: GenerateReportInput,
): Promise<void> {
  const execution = executions.get(executionId)
  if (!execution) return

  // Update status to generating
  execution.status = 'generating'
  executions.set(executionId, execution)

  try {
    // Simulate report generation delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Generate mock file info
    const _filename = `report-${executionId}.${input.format}`
    const fileUrl = `/api/reports/executions/${executionId}/download`

    // Update execution with results
    execution.status = 'completed'
    execution.fileUrl = fileUrl
    execution.fileSize = Math.floor(Math.random() * 100000) + 1000
    execution.rowCount = Math.floor(Math.random() * 1000) + 1
    execution.completedAt = new Date().toISOString()
    execution.expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString() // 24 hours

    executions.set(executionId, execution)
  } catch (error) {
    execution.status = 'failed'
    execution.error = error instanceof Error ? error.message : 'Unknown error'
    execution.completedAt = new Date().toISOString()
    executions.set(executionId, execution)
  }
}

export async function getExecutionFile(
  id: string,
): Promise<{ data: Uint8Array; filename: string; contentType: string } | null> {
  const execution = await getExecution(id)
  if (!execution || execution.status !== 'completed' || !execution.fileUrl) {
    return null
  }

  // Generate mock file content based on format
  const contentTypeMap: Record<ReportFormat, string> = {
    pdf: 'application/pdf',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    json: 'application/json',
    html: 'text/html',
  }

  const extensionMap: Record<ReportFormat, string> = {
    pdf: 'pdf',
    excel: 'xlsx',
    csv: 'csv',
    json: 'json',
    html: 'html',
  }

  const filename = `report-${id}.${extensionMap[execution.format]}`
  const contentType = contentTypeMap[execution.format]

  // Generate mock content
  let content: string
  switch (execution.format) {
    case 'json':
      content = JSON.stringify(
        {
          reportId: execution.reportId,
          generatedAt: execution.completedAt,
          rowCount: execution.rowCount,
          data: [],
        },
        null,
        2,
      )
      break
    case 'csv':
      content = 'id,name,value\n1,Sample,100\n2,Data,200\n'
      break
    case 'html':
      content = `<!DOCTYPE html>
<html>
<head><title>Report ${id}</title></head>
<body>
<h1>Report</h1>
<p>Generated at: ${execution.completedAt}</p>
<p>Row count: ${execution.rowCount}</p>
</body>
</html>`
      break
    default:
      content = `Report ${id} - Generated at ${execution.completedAt}`
  }

  return {
    data: new TextEncoder().encode(content),
    filename,
    contentType,
  }
}

// ============================================================================
// Schedule Operations
// ============================================================================

export async function getSchedules(
  reportId?: string,
): Promise<ReportSchedule[]> {
  const allSchedules = Array.from(schedules.values())
  if (reportId) {
    return allSchedules.filter((s) => s.reportId === reportId)
  }
  return allSchedules
}

export async function getSchedule(id: string): Promise<ReportSchedule | null> {
  return schedules.get(id) || null
}

// Overloaded createSchedule to support both single-object and two-argument forms
export async function createSchedule(
  dataOrReportId: Omit<ReportSchedule, 'id' | 'lastRun' | 'nextRun'> | string,
  scheduleInput?: CreateScheduleInput,
): Promise<ReportSchedule> {
  let data: Omit<ReportSchedule, 'id' | 'lastRun' | 'nextRun'>

  if (typeof dataOrReportId === 'string') {
    // Two-argument form: createSchedule(reportId, schedule)
    if (!scheduleInput) {
      throw new Error('Schedule input is required when using two-argument form')
    }
    data = {
      ...scheduleInput,
      reportId: dataOrReportId,
    }
  } else {
    // Single-object form: createSchedule(data)
    data = dataOrReportId
  }

  // Verify template exists
  const template = await getTemplate(data.reportId)
  if (!template) {
    throw new Error(`Template not found: ${data.reportId}`)
  }

  const schedule: ReportSchedule = {
    ...data,
    id: generateId(),
    nextRun: calculateNextRun(data),
  }

  schedules.set(schedule.id, schedule)
  return schedule
}

export async function updateSchedule(
  id: string,
  data: Partial<Omit<ReportSchedule, 'id'>>,
): Promise<ReportSchedule> {
  const existing = schedules.get(id)
  if (!existing) {
    throw new Error(`Schedule not found: ${id}`)
  }

  const updated: ReportSchedule = {
    ...existing,
    ...data,
    id: existing.id,
  }

  // Recalculate next run if schedule changed
  if (
    data.frequency !== undefined ||
    data.time !== undefined ||
    data.dayOfWeek !== undefined ||
    data.dayOfMonth !== undefined
  ) {
    updated.nextRun = calculateNextRun(updated)
  }

  schedules.set(id, updated)
  return updated
}

export async function deleteSchedule(id: string): Promise<void> {
  const deleted = schedules.delete(id)
  if (!deleted) {
    throw new Error(`Schedule not found: ${id}`)
  }
}

function calculateNextRun(
  schedule: Omit<ReportSchedule, 'id' | 'lastRun' | 'nextRun'> | ReportSchedule,
): string {
  const now = new Date()
  const [hours, minutes] = schedule.time.split(':').map(Number)

  let nextRun = new Date(now)
  nextRun.setHours(hours, minutes, 0, 0)

  switch (schedule.frequency) {
    case 'once':
      if (nextRun <= now) {
        // If the time has passed, schedule for tomorrow
        nextRun.setDate(nextRun.getDate() + 1)
      }
      break
    case 'hourly':
      nextRun.setMinutes(minutes, 0, 0)
      if (nextRun <= now) {
        nextRun.setHours(nextRun.getHours() + 1)
      }
      break
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1)
      }
      break
    case 'weekly':
      if (schedule.dayOfWeek !== undefined) {
        const daysUntilTarget = (schedule.dayOfWeek - now.getDay() + 7) % 7 || 7
        nextRun.setDate(now.getDate() + daysUntilTarget)
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7)
        }
      }
      break
    case 'monthly':
      if (schedule.dayOfMonth !== undefined) {
        nextRun.setDate(schedule.dayOfMonth)
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1)
        }
      }
      break
  }

  return nextRun.toISOString()
}

// ============================================================================
// Statistics
// ============================================================================

export async function getReportStats(): Promise<ReportStats> {
  const allTemplates = Array.from(templates.values())
  const allExecutions = Array.from(executions.values())
  const allSchedules = Array.from(schedules.values())

  const byFormat: Record<ReportFormat, number> = {
    pdf: 0,
    excel: 0,
    csv: 0,
    json: 0,
    html: 0,
  }

  const byStatus: Record<ReportStatus, number> = {
    pending: 0,
    generating: 0,
    completed: 0,
    failed: 0,
    expired: 0,
  }

  for (const execution of allExecutions) {
    byFormat[execution.format] = (byFormat[execution.format] || 0) + 1
    byStatus[execution.status] = (byStatus[execution.status] || 0) + 1
  }

  // Get recent executions (last 10)
  const recentExecutions = allExecutions
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )
    .slice(0, 10)

  return {
    totalTemplates: allTemplates.length,
    totalExecutions: allExecutions.length,
    totalScheduled: allSchedules.filter((s) => s.enabled).length,
    byFormat,
    byStatus,
    recentExecutions,
  }
}

// ============================================================================
// Seed some initial data for development
// ============================================================================

export async function seedReportData(): Promise<void> {
  // Only seed if empty
  if (templates.size > 0) return

  // Create sample templates
  const sampleTemplates = [
    {
      name: 'User Activity Report',
      description: 'Summary of user activity across the system',
      category: 'Users',
      dataSource: {
        type: 'database' as const,
        query: 'SELECT * FROM user_activity',
      },
      columns: [
        {
          id: 'user_id',
          name: 'User ID',
          field: 'user_id',
          type: 'string' as const,
        },
        {
          id: 'action',
          name: 'Action',
          field: 'action',
          type: 'string' as const,
        },
        {
          id: 'timestamp',
          name: 'Timestamp',
          field: 'timestamp',
          type: 'date' as const,
        },
      ],
      createdBy: 'system',
    },
    {
      name: 'Service Health Report',
      description: 'Health metrics for all services',
      category: 'System',
      dataSource: {
        type: 'api' as const,
        endpoint: '/api/services/health',
      },
      columns: [
        {
          id: 'service',
          name: 'Service',
          field: 'service',
          type: 'string' as const,
        },
        {
          id: 'status',
          name: 'Status',
          field: 'status',
          type: 'string' as const,
        },
        {
          id: 'uptime',
          name: 'Uptime %',
          field: 'uptime',
          type: 'number' as const,
        },
      ],
      createdBy: 'system',
    },
  ]

  for (const data of sampleTemplates) {
    await createTemplate(data)
  }
}

// ============================================================================
// Alias Functions (for useReports hook compatibility)
// ============================================================================

// Template aliases
export const getReportTemplates = async (
  category?: string,
): Promise<ReportTemplate[]> => {
  const allTemplates = await getTemplates()
  if (category) {
    return allTemplates.filter((t) => t.category === category)
  }
  return allTemplates
}

export const getReportTemplateById = async (
  id: string,
): Promise<ReportTemplate> => {
  const template = await getTemplate(id)
  if (!template) {
    throw new Error(`Template not found: ${id}`)
  }
  return template
}

export const createReportTemplate = createTemplate

export const updateReportTemplate = async (
  id: string,
  updates: UpdateReportTemplateInput,
): Promise<ReportTemplate> => {
  const updated = await updateTemplate(id, updates)
  if (!updated) {
    throw new Error(`Template not found: ${id}`)
  }
  return updated
}

export const deleteReportTemplate = async (id: string): Promise<void> => {
  await deleteTemplate(id)
}

export const getTemplateById = getReportTemplateById
export const getScheduleById = async (id: string): Promise<ReportSchedule> => {
  const schedule = await getSchedule(id)
  if (!schedule) {
    throw new Error(`Schedule not found: ${id}`)
  }
  return schedule
}

// Execution aliases
export const getReportExecutions = async (
  reportId?: string,
  options?: GetReportExecutionsOptions,
): Promise<ReportExecution[]> => {
  return getExecutions({ reportId, ...options })
}

export const getReportExecution = async (
  id: string,
): Promise<ReportExecution> => {
  const execution = await getExecution(id)
  if (!execution) {
    throw new Error(`Execution not found: ${id}`)
  }
  return execution
}

export const getExecutionById = getReportExecution

// Download function for client-side use
export const downloadReport = async (executionId: string): Promise<Blob> => {
  // For client-side, fetch from the API endpoint
  const response = await fetch(
    `/api/reports/executions/${executionId}/download`,
  )
  if (!response.ok) {
    throw new Error('Report file not found')
  }
  return response.blob()
}

// Initialize seed data
seedReportData()
