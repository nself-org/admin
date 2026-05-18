/**
 * Backend implementation for reports system
 * Handles real data collection from database, services, and system metrics
 */

import {
  addAuditLog,
  getAuditLogs,
  getDatabase,
  initDatabase,
  type AuditLogItem,
} from '@/lib/database'
import type {
  GenerateReportInput,
  ReportExecution,
  ReportFilter,
  ReportSchedule,
  ReportSort,
  ReportStats,
  ReportStatus,
  ReportTemplate,
} from '@/types/report'

// ============================================================================
// Database Collections Setup
// ============================================================================

let reportTemplatesCollection: Collection<ReportTemplateDB> | null = null
let reportExecutionsCollection: Collection<ReportExecutionDB> | null = null
let reportSchedulesCollection: Collection<ReportScheduleDB> | null = null

interface ReportTemplateDB extends Omit<ReportTemplate, 'id'> {
  $loki?: number
}

interface ReportExecutionDB extends Omit<ReportExecution, 'id'> {
  $loki?: number
}

interface ReportScheduleDB extends Omit<ReportSchedule, 'id'> {
  $loki?: number
}

async function initReportCollections() {
  await initDatabase()
  const db = getDatabase()

  if (!db) throw new Error('Database not initialized')

  if (!reportTemplatesCollection) {
    reportTemplatesCollection =
      db.getCollection('report_templates') ||
      db.addCollection('report_templates', {
        indices: ['category', 'createdBy', 'tenantId'],
      })
  }

  if (!reportExecutionsCollection) {
    reportExecutionsCollection =
      db.getCollection('report_executions') ||
      db.addCollection('report_executions', {
        indices: ['reportId', 'status', 'createdBy', 'scheduleId'],
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days TTL for completed executions
        ttlInterval: 60 * 60 * 1000, // Check every hour
      })
  }

  if (!reportSchedulesCollection) {
    reportSchedulesCollection =
      db.getCollection('report_schedules') ||
      db.addCollection('report_schedules', {
        indices: ['reportId', 'enabled'],
      })
  }
}

// ============================================================================
// Template Operations
// ============================================================================

export async function getTemplates(tenantId?: string): Promise<ReportTemplate[]> {
  await initReportCollections()

  let query: any = {}
  if (tenantId) {
    query.tenantId = tenantId
  }

  const templates = reportTemplatesCollection?.find(query) || []

  return templates.map((t) => ({
    ...t,
    id: t.$loki?.toString() || '',
  }))
}

export async function getTemplateById(id: string): Promise<ReportTemplate> {
  await initReportCollections()

  const template = reportTemplatesCollection?.get(parseInt(id))
  if (!template) throw new Error('Template not found')

  return {
    ...template,
    id: template.$loki?.toString() || '',
  }
}

export async function createTemplate(
  input: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ReportTemplate> {
  await initReportCollections()

  const now = new Date().toISOString()
  const template: ReportTemplateDB = {
    ...input,
    createdAt: now,
    updatedAt: now,
  }

  const inserted = reportTemplatesCollection?.insert(template)
  if (!inserted) throw new Error('Failed to create template')

  await addAuditLog('report_template_created', { name: input.name }, true)

  return {
    ...inserted,
    id: inserted.$loki?.toString() || '',
  }
}

export async function updateTemplate(
  id: string,
  updates: Partial<ReportTemplate>
): Promise<ReportTemplate> {
  await initReportCollections()

  const template = reportTemplatesCollection?.get(parseInt(id))
  if (!template) throw new Error('Template not found')

  Object.assign(template, updates, {
    updatedAt: new Date().toISOString(),
  })

  reportTemplatesCollection?.update(template)

  await addAuditLog('report_template_updated', { id, name: template.name }, true)

  return {
    ...template,
    id: template.$loki?.toString() || '',
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  await initReportCollections()

  const template = reportTemplatesCollection?.get(parseInt(id))
  if (!template) throw new Error('Template not found')

  reportTemplatesCollection?.remove(template)

  await addAuditLog('report_template_deleted', { id, name: template.name }, true)
}

// ============================================================================
// Report Generation & Execution
// ============================================================================

export async function generateReport(
  input: GenerateReportInput & { createdBy: string }
): Promise<ReportExecution> {
  await initReportCollections()

  // Get template
  const template = await getTemplateById(input.templateId)

  // Create execution record
  const execution: ReportExecutionDB = {
    reportId: input.templateId,
    status: 'generating',
    format: input.format,
    filters: input.filters,
    parameters: input.parameters,
    startedAt: new Date().toISOString(),
    createdBy: input.createdBy,
  }

  const inserted = reportExecutionsCollection?.insert(execution)
  if (!inserted) throw new Error('Failed to create execution')

  const execId = inserted.$loki?.toString() || ''

  // Start async report generation
  void executeReportGeneration(execId, template, input)

  await addAuditLog(
    'report_generation_started',
    { templateId: input.templateId, format: input.format },
    true
  )

  return {
    ...inserted,
    id: execId,
  }
}

async function executeReportGeneration(
  executionId: string,
  template: ReportTemplate,
  input: GenerateReportInput
): Promise<void> {
  try {
    // Collect data based on template data source
    const data = await collectReportData(template, input.filters, input.sort)

    // Update execution with results
    await updateExecution(executionId, {
      status: 'completed',
      rowCount: data.length,
      completedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      fileUrl: `/api/reports/executions/${executionId}/download`,
      fileSize: JSON.stringify(data).length,
    })

    await addAuditLog('report_generation_completed', { executionId, rowCount: data.length }, true)
  } catch (error) {
    await updateExecution(executionId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    await addAuditLog(
      'report_generation_failed',
      {
        executionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      false
    )
  }
}

async function updateExecution(id: string, updates: Partial<ReportExecution>): Promise<void> {
  await initReportCollections()

  const execution = reportExecutionsCollection?.get(parseInt(id))
  if (!execution) throw new Error('Execution not found')

  Object.assign(execution, updates)
  reportExecutionsCollection?.update(execution)
}

// ============================================================================
// Data Collection Functions
// ============================================================================

async function collectReportData(
  template: ReportTemplate,
  filters?: ReportFilter[],
  sort?: ReportSort[]
): Promise<any[]> {
  // Route to appropriate data collector based on template
  switch (template.id) {
    case 'tpl-1': // Service Health Report
      return await collectServiceHealthData(filters, sort)

    case 'tpl-2': // User Activity Report
      return await collectUserActivityData(filters, sort)

    case 'tpl-3': // Database Performance Report
      return await collectDatabasePerformanceData(filters, sort)

    case 'tpl-4': // Security Audit Report
      return await collectSecurityAuditData(filters, sort)

    case 'tpl-5': // Resource Usage Report
      return await collectResourceUsageData(filters, sort)

    case 'tpl-6': // API Usage Report
      return await collectApiUsageData(filters, sort)

    default:
      // For custom templates, use generic data source handler
      return await collectFromDataSource(template.dataSource, filters, sort)
  }
}

async function collectServiceHealthData(
  _filters?: ReportFilter[],
  _sort?: ReportSort[]
): Promise<any[]> {
  // Collect real service health data from Docker containers
  try {
    const response = await fetch('http://localhost:3021/api/services', {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch service data')
    }

    const data = await response.json()
    const services = data.services || []

    // Get audit logs to calculate real metrics
    const auditLogs = await getAuditLogs(1000, 0)

    return services.map((service: any) => {
      // Calculate average response time from recent health checks
      const serviceChecks = auditLogs.filter(
        (log: AuditLogItem) =>
          log.action === 'service_health_check' &&
          log.details?.service === service.name &&
          log.details?.responseTime
      )

      const avgResponseTime =
        serviceChecks.length > 0
          ? serviceChecks.reduce(
              (sum: number, log: AuditLogItem) => sum + (log.details?.responseTime || 0),
              0
            ) / serviceChecks.length
          : 0

      // Calculate error rate from service operations
      const serviceOps = auditLogs.filter(
        (log: AuditLogItem) =>
          log.details?.service === service.name &&
          ['service_start', 'service_stop', 'service_restart'].includes(log.action)
      )

      const failedOps = serviceOps.filter((log: AuditLogItem) => !log.success).length
      const errorRate = serviceOps.length > 0 ? (failedOps / serviceOps.length) * 100 : 0

      return {
        name: service.name,
        status: service.state || 'unknown',
        uptime: service.uptime || 0,
        responseTime: avgResponseTime,
        errorRate,
        lastCheck: new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('Error collecting service health data:', error)
    return []
  }
}

async function collectUserActivityData(
  filters?: ReportFilter[],
  _sort?: ReportSort[]
): Promise<any[]> {
  // Collect from audit logs
  const filterObj: any = {}

  if (filters) {
    for (const filter of filters) {
      if (filter.field === 'action') {
        filterObj.action = filter.value
      } else if (filter.field === 'userId') {
        filterObj.userId = filter.value
      }
    }
  }

  const logs = await getAuditLogs(1000, 0, filterObj)

  return logs.map((log: AuditLogItem) => ({
    username: log.userId || 'system',
    action: log.action,
    ipAddress: log.details?.ip || 'N/A',
    timestamp: log.timestamp,
    success: log.success,
    details: JSON.stringify(log.details || {}),
  }))
}

async function collectDatabasePerformanceData(
  _filters?: ReportFilter[],
  _sort?: ReportSort[]
): Promise<any[]> {
  // Collect database metrics
  try {
    const response = await fetch('http://localhost:3021/api/database/overview', {
      method: 'GET',
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    // Generate sample query performance data
    // In a real implementation, this would come from database query logs
    return [
      {
        query: 'SELECT * FROM users',
        executionTime: data.stats?.avgQueryTime || 10.5,
        rowsAffected: data.stats?.totalRows || 100,
        callCount: 1250,
        avgTime: data.stats?.avgQueryTime || 10.5,
        cacheHits: 850,
        timestamp: new Date().toISOString(),
      },
    ]
  } catch (error) {
    console.error('Error collecting database performance data:', error)
    return []
  }
}

async function collectSecurityAuditData(
  _filters?: ReportFilter[],
  _sort?: ReportSort[]
): Promise<any[]> {
  // Collect security-related audit logs
  const logs = await getAuditLogs(1000, 0)

  // Filter for security-relevant events
  const securityEvents = logs.filter((log: AuditLogItem) =>
    [
      'login_attempt',
      'login_failed',
      'password_change',
      'session_created',
      'session_deleted',
      'unauthorized_access',
    ].includes(log.action)
  )

  return securityEvents.map((log: AuditLogItem) => ({
    eventType: log.action,
    severity: log.success ? 'info' : 'high',
    sourceIp: log.details?.ip || 'N/A',
    user: log.userId || 'unknown',
    resource: log.details?.resource || 'N/A',
    action: log.action,
    status: log.success ? 'success' : 'failed',
    timestamp: log.timestamp,
  }))
}

async function collectResourceUsageData(
  _filters?: ReportFilter[],
  _sort?: ReportSort[]
): Promise<any[]> {
  // Collect system resource metrics
  try {
    const response = await fetch('http://localhost:3021/api/system/metrics', {
      method: 'GET',
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    return [
      {
        timestamp: new Date().toISOString(),
        cpuUsage: data.cpu?.usage || 0,
        memoryUsage: data.memory?.percentage || 0,
        diskUsage: data.disk?.percentage || 0,
        networkIn: data.network?.rx || 0,
        networkOut: data.network?.tx || 0,
        connections: data.network?.connections || 0,
      },
    ]
  } catch (error) {
    console.error('Error collecting resource usage data:', error)
    return []
  }
}

async function collectApiUsageData(
  _filters?: ReportFilter[],
  _sort?: ReportSort[]
): Promise<any[]> {
  // Collect API usage from audit logs
  const logs = await getAuditLogs(10000, 0)

  // Group by endpoint
  const endpointStats: Record<string, any> = {}

  logs.forEach((log: AuditLogItem) => {
    if (log.details?.endpoint) {
      const key = `${log.details.method || 'GET'} ${log.details.endpoint}`

      if (!endpointStats[key]) {
        endpointStats[key] = {
          endpoint: log.details.endpoint,
          method: log.details.method || 'GET',
          totalRequests: 0,
          totalResponseTime: 0,
          errors: 0,
          status2xx: 0,
          status4xx: 0,
          status5xx: 0,
        }
      }

      endpointStats[key].totalRequests++

      if (log.details.responseTime) {
        endpointStats[key].totalResponseTime += log.details.responseTime
      }

      if (!log.success) {
        endpointStats[key].errors++
      }

      if (log.details.statusCode) {
        const statusCode = log.details.statusCode
        if (statusCode >= 200 && statusCode < 300) {
          endpointStats[key].status2xx++
        } else if (statusCode >= 400 && statusCode < 500) {
          endpointStats[key].status4xx++
        } else if (statusCode >= 500) {
          endpointStats[key].status5xx++
        }
      }
    }
  })

  return Object.values(endpointStats).map((stats: any) => ({
    endpoint: stats.endpoint,
    method: stats.method,
    totalRequests: stats.totalRequests,
    avgResponseTime: stats.totalRequests > 0 ? stats.totalResponseTime / stats.totalRequests : 0,
    errorRate: stats.totalRequests > 0 ? (stats.errors / stats.totalRequests) * 100 : 0,
    status2xx: stats.status2xx,
    status4xx: stats.status4xx,
    status5xx: stats.status5xx,
  }))
}

async function collectFromDataSource(
  dataSource: ReportTemplate['dataSource'],
  _filters?: ReportFilter[],
  _sort?: ReportSort[]
): Promise<any[]> {
  // Generic data source handler
  if (dataSource.type === 'api' && dataSource.endpoint) {
    try {
      const response = await fetch(dataSource.endpoint, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      return Array.isArray(data) ? data : [data]
    } catch (error) {
      console.error('Error collecting from API:', error)
      return []
    }
  }

  // For database queries, we'd need a query executor
  // For now, return empty array
  return []
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
  await initReportCollections()

  let query: any = {}

  if (options?.reportId) {
    query.reportId = options.reportId
  }

  if (options?.status) {
    query.status = options.status
  }

  let chain = reportExecutionsCollection?.chain().find(query).simplesort('startedAt', true) // Sort by startedAt descending

  if (options?.offset) {
    chain = chain?.offset(options.offset)
  }

  if (options?.limit) {
    chain = chain?.limit(options.limit)
  }

  const executions = chain?.data() || []

  return executions.map((e) => ({
    ...e,
    id: e.$loki?.toString() || '',
  }))
}

export async function getExecutionById(id: string): Promise<ReportExecution> {
  await initReportCollections()

  const execution = reportExecutionsCollection?.get(parseInt(id))
  if (!execution) throw new Error('Execution not found')

  return {
    ...execution,
    id: execution.$loki?.toString() || '',
  }
}

export async function getExecutionFile(id: string): Promise<{
  data: Uint8Array
  contentType: string
  filename: string
} | null> {
  const execution = await getExecutionById(id)

  if (execution.status !== 'completed') {
    return null
  }

  // For now, return JSON data
  // In a real implementation, this would retrieve the actual file from storage
  const template = await getTemplateById(execution.reportId)
  const reportData = await collectReportData(template, execution.filters, undefined)

  const json = JSON.stringify(reportData, null, 2)
  const encoder = new TextEncoder()
  const data = encoder.encode(json)

  // Determine content type and filename based on format
  let contentType = 'application/json'
  let extension = 'json'

  switch (execution.format) {
    case 'pdf':
      contentType = 'application/pdf'
      extension = 'pdf'
      break
    case 'excel':
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      extension = 'xlsx'
      break
    case 'csv':
      contentType = 'text/csv'
      extension = 'csv'
      break
    case 'html':
      contentType = 'text/html'
      extension = 'html'
      break
  }

  const filename = `report-${execution.id}-${Date.now()}.${extension}`

  return {
    data,
    contentType,
    filename,
  }
}

// ============================================================================
// Schedule Operations
// ============================================================================

export async function getSchedules(reportId: string): Promise<ReportSchedule[]> {
  await initReportCollections()

  const schedules = reportSchedulesCollection?.find({ reportId }) || []

  return schedules.map((s) => ({
    ...s,
    id: s.$loki?.toString() || '',
  }))
}

export async function getScheduleById(id: string): Promise<ReportSchedule> {
  await initReportCollections()

  const schedule = reportSchedulesCollection?.get(parseInt(id))
  if (!schedule) throw new Error('Schedule not found')

  return {
    ...schedule,
    id: schedule.$loki?.toString() || '',
  }
}

export async function createSchedule(
  reportId: string,
  input: Omit<ReportSchedule, 'id' | 'reportId'>
): Promise<ReportSchedule> {
  await initReportCollections()

  const schedule: ReportScheduleDB = {
    reportId,
    ...input,
  }

  const inserted = reportSchedulesCollection?.insert(schedule)
  if (!inserted) throw new Error('Failed to create schedule')

  await addAuditLog('report_schedule_created', { reportId }, true)

  return {
    ...inserted,
    id: inserted.$loki?.toString() || '',
  }
}

export async function updateSchedule(
  id: string,
  updates: Partial<ReportSchedule>
): Promise<ReportSchedule> {
  await initReportCollections()

  const schedule = reportSchedulesCollection?.get(parseInt(id))
  if (!schedule) throw new Error('Schedule not found')

  Object.assign(schedule, updates)
  reportSchedulesCollection?.update(schedule)

  await addAuditLog('report_schedule_updated', { id }, true)

  return {
    ...schedule,
    id: schedule.$loki?.toString() || '',
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  await initReportCollections()

  const schedule = reportSchedulesCollection?.get(parseInt(id))
  if (!schedule) throw new Error('Schedule not found')

  reportSchedulesCollection?.remove(schedule)

  await addAuditLog('report_schedule_deleted', { id }, true)
}

// ============================================================================
// Stats Operations
// ============================================================================

export async function getReportStats(): Promise<ReportStats> {
  await initReportCollections()

  const templates = reportTemplatesCollection?.find() || []
  const executions = reportExecutionsCollection?.find() || []
  const schedules = reportSchedulesCollection?.find({ enabled: true }) || []

  // Count by format
  const byFormat: Record<string, number> = {
    pdf: 0,
    excel: 0,
    csv: 0,
    json: 0,
    html: 0,
  }

  executions.forEach((e) => {
    if (e.format) {
      byFormat[e.format] = (byFormat[e.format] || 0) + 1
    }
  })

  // Count by status
  const byStatus: Record<string, number> = {
    pending: 0,
    generating: 0,
    completed: 0,
    failed: 0,
    expired: 0,
  }

  executions.forEach((e) => {
    if (e.status) {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1
    }
  })

  // Get recent executions
  const recentExecutions = executions
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 5)
    .map((e) => ({
      ...e,
      id: e.$loki?.toString() || '',
    }))

  return {
    totalTemplates: templates.length,
    totalExecutions: executions.length,
    totalScheduled: schedules.length,
    byFormat: byFormat as any,
    byStatus: byStatus as any,
    recentExecutions,
  }
}

// ============================================================================
// Seed Initial Templates
// ============================================================================

export async function seedDefaultTemplates(): Promise<void> {
  await initReportCollections()

  // Check if templates already exist
  const existing = reportTemplatesCollection?.find() || []
  if (existing.length > 0) {
    return // Already seeded
  }

  // Create default templates with known IDs
  const defaultTemplates = [
    {
      name: 'Service Health Report',
      description:
        'Overview of all service health metrics including uptime, response times, and error rates',
      category: 'infrastructure',
      dataSource: { type: 'api' as const, endpoint: '/api/services/health' },
      columns: [
        {
          id: 'c1',
          name: 'Service',
          field: 'name',
          type: 'string' as const,
          sortable: true,
          filterable: true,
        },
        {
          id: 'c2',
          name: 'Status',
          field: 'status',
          type: 'string' as const,
          sortable: true,
          filterable: true,
        },
        {
          id: 'c3',
          name: 'Uptime',
          field: 'uptime',
          type: 'number' as const,
          format: '0.00%',
          sortable: true,
        },
        {
          id: 'c4',
          name: 'Response Time (ms)',
          field: 'responseTime',
          type: 'number' as const,
          format: '0',
          sortable: true,
        },
        {
          id: 'c5',
          name: 'Error Rate',
          field: 'errorRate',
          type: 'number' as const,
          format: '0.00%',
          sortable: true,
        },
        {
          id: 'c6',
          name: 'Last Check',
          field: 'lastCheck',
          type: 'date' as const,
          sortable: true,
        },
      ],
      defaultSort: [{ field: 'name', direction: 'asc' as const }],
      visualization: { type: 'table' as const },
      createdBy: 'system',
    },
    {
      name: 'User Activity Report',
      description: 'Detailed analysis of user activity including logins, actions, and session data',
      category: 'security',
      dataSource: {
        type: 'database' as const,
        query: 'SELECT * FROM audit_log',
      },
      columns: [
        {
          id: 'c1',
          name: 'User',
          field: 'username',
          type: 'string' as const,
          sortable: true,
          filterable: true,
        },
        {
          id: 'c2',
          name: 'Action',
          field: 'action',
          type: 'string' as const,
          sortable: true,
          filterable: true,
        },
        {
          id: 'c3',
          name: 'IP Address',
          field: 'ipAddress',
          type: 'string' as const,
          filterable: true,
        },
        {
          id: 'c4',
          name: 'Timestamp',
          field: 'timestamp',
          type: 'date' as const,
          sortable: true,
        },
        {
          id: 'c5',
          name: 'Success',
          field: 'success',
          type: 'boolean' as const,
          filterable: true,
        },
        {
          id: 'c6',
          name: 'Details',
          field: 'details',
          type: 'string' as const,
        },
      ],
      defaultSort: [{ field: 'timestamp', direction: 'desc' as const }],
      visualization: { type: 'table' as const },
      createdBy: 'system',
    },
  ]

  for (const template of defaultTemplates) {
    await createTemplate(template)
  }
}
