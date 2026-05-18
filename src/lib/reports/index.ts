/**
 * Reports library for nself-admin
 * Server-side functions use backend, client-side uses API calls
 */

import type {
  GenerateReportInput,
  ReportExecution,
  ReportFilter,
  ReportFormat,
  ReportSchedule,
  ReportScheduleFrequency,
  ReportSort,
  ReportStats,
  ReportStatus,
  ReportTemplate,
} from '@/types/report'

// Server-side backend (only available server-side)
let backend: typeof import('./backend') | null = null

// Lazy load backend only on server-side
async function getBackend() {
  if (typeof window !== 'undefined') {
    throw new Error('Backend functions can only be called server-side')
  }

  if (!backend) {
    backend = await import('./backend')
  }

  return backend
}

// ============================================================================
// Default Templates (for reference and seeding)
// ============================================================================

/**
 * Default report templates for common reports (type doesn't enforce strict typing)
 */
export const defaultTemplates: any[] = [
  {
    name: 'Service Health Report',
    description:
      'Overview of all service health metrics including uptime, response times, and error rates',
    category: 'infrastructure',
    dataSource: { type: 'api', endpoint: '/api/services/health' },
    columns: [
      {
        id: 'c1',
        name: 'Service',
        field: 'name',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        id: 'c2',
        name: 'Status',
        field: 'status',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        id: 'c3',
        name: 'Uptime',
        field: 'uptime',
        type: 'number',
        format: '0.00%',
        sortable: true,
      },
      {
        id: 'c4',
        name: 'Response Time (ms)',
        field: 'responseTime',
        type: 'number',
        format: '0',
        sortable: true,
      },
      {
        id: 'c5',
        name: 'Error Rate',
        field: 'errorRate',
        type: 'number',
        format: '0.00%',
        sortable: true,
      },
      {
        id: 'c6',
        name: 'Last Check',
        field: 'lastCheck',
        type: 'date',
        sortable: true,
      },
    ],
    defaultSort: [{ field: 'name', direction: 'asc' }],
    visualization: { type: 'table' },
    createdBy: 'system',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    // Template ID will be assigned by database
    // id: 'tpl-2',
    name: 'User Activity Report',
    description: 'Detailed analysis of user activity including logins, actions, and session data',
    category: 'security',
    dataSource: { type: 'database', query: 'SELECT * FROM audit_log' },
    columns: [
      {
        id: 'c1',
        name: 'User',
        field: 'username',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        id: 'c2',
        name: 'Action',
        field: 'action',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        id: 'c3',
        name: 'IP Address',
        field: 'ipAddress',
        type: 'string',
        filterable: true,
      },
      {
        id: 'c4',
        name: 'Timestamp',
        field: 'timestamp',
        type: 'date',
        sortable: true,
      },
      {
        id: 'c5',
        name: 'Success',
        field: 'success',
        type: 'boolean',
        filterable: true,
      },
      { id: 'c6', name: 'Details', field: 'details', type: 'string' },
    ],
    defaultSort: [{ field: 'timestamp', direction: 'desc' }],
    visualization: { type: 'table' },
    createdBy: 'system',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    // Template ID will be assigned by database
    // id: 'tpl-3',
    name: 'Database Performance Report',
    description:
      'Database performance metrics including query times, connection pools, and resource usage',
    category: 'database',
    dataSource: { type: 'service', endpoint: '/api/database/metrics' },
    columns: [
      {
        id: 'c1',
        name: 'Query',
        field: 'query',
        type: 'string',
        filterable: true,
      },
      {
        id: 'c2',
        name: 'Execution Time (ms)',
        field: 'executionTime',
        type: 'number',
        format: '0.00',
        sortable: true,
      },
      {
        id: 'c3',
        name: 'Rows Affected',
        field: 'rowsAffected',
        type: 'number',
        format: '0',
        sortable: true,
      },
      {
        id: 'c4',
        name: 'Calls',
        field: 'callCount',
        type: 'number',
        format: '0',
        sortable: true,
        aggregation: 'sum',
      },
      {
        id: 'c5',
        name: 'Avg Time',
        field: 'avgTime',
        type: 'number',
        format: '0.00',
        sortable: true,
        aggregation: 'avg',
      },
      {
        id: 'c6',
        name: 'Cache Hits',
        field: 'cacheHits',
        type: 'number',
        format: '0',
        aggregation: 'sum',
      },
      {
        id: 'c7',
        name: 'Timestamp',
        field: 'timestamp',
        type: 'date',
        sortable: true,
      },
    ],
    defaultSort: [{ field: 'executionTime', direction: 'desc' }],
    visualization: { type: 'chart', chartType: 'bar' },
    createdBy: 'system',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    // Template ID will be assigned by database
    // id: 'tpl-4',
    name: 'Security Audit Report',
    description:
      'Comprehensive security audit including access attempts, permission changes, and threat detection',
    category: 'security',
    dataSource: { type: 'database', query: 'SELECT * FROM security_events' },
    columns: [
      {
        id: 'c1',
        name: 'Event Type',
        field: 'eventType',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        id: 'c2',
        name: 'Severity',
        field: 'severity',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        id: 'c3',
        name: 'Source IP',
        field: 'sourceIp',
        type: 'string',
        filterable: true,
      },
      {
        id: 'c4',
        name: 'User',
        field: 'user',
        type: 'string',
        filterable: true,
      },
      {
        id: 'c5',
        name: 'Resource',
        field: 'resource',
        type: 'string',
        filterable: true,
      },
      {
        id: 'c6',
        name: 'Action',
        field: 'action',
        type: 'string',
        filterable: true,
      },
      {
        id: 'c7',
        name: 'Status',
        field: 'status',
        type: 'string',
        filterable: true,
      },
      {
        id: 'c8',
        name: 'Timestamp',
        field: 'timestamp',
        type: 'date',
        sortable: true,
      },
    ],
    defaultFilters: [{ field: 'severity', operator: 'in', value: ['high', 'critical'] }],
    defaultSort: [{ field: 'timestamp', direction: 'desc' }],
    visualization: { type: 'table' },
    createdBy: 'system',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    // Template ID will be assigned by database
    // id: 'tpl-5',
    name: 'Resource Usage Report',
    description:
      'System resource utilization including CPU, memory, disk, and network usage over time',
    category: 'infrastructure',
    dataSource: { type: 'api', endpoint: '/api/system/resources' },
    columns: [
      {
        id: 'c1',
        name: 'Timestamp',
        field: 'timestamp',
        type: 'date',
        sortable: true,
      },
      {
        id: 'c2',
        name: 'CPU Usage',
        field: 'cpuUsage',
        type: 'number',
        format: '0.0%',
        sortable: true,
      },
      {
        id: 'c3',
        name: 'Memory Usage',
        field: 'memoryUsage',
        type: 'number',
        format: '0.0%',
        sortable: true,
      },
      {
        id: 'c4',
        name: 'Disk Usage',
        field: 'diskUsage',
        type: 'number',
        format: '0.0%',
        sortable: true,
      },
      {
        id: 'c5',
        name: 'Network In (MB)',
        field: 'networkIn',
        type: 'number',
        format: '0.00',
        sortable: true,
      },
      {
        id: 'c6',
        name: 'Network Out (MB)',
        field: 'networkOut',
        type: 'number',
        format: '0.00',
        sortable: true,
      },
      {
        id: 'c7',
        name: 'Active Connections',
        field: 'connections',
        type: 'number',
        format: '0',
        sortable: true,
      },
    ],
    defaultSort: [{ field: 'timestamp', direction: 'desc' }],
    visualization: { type: 'chart', chartType: 'line' },
    createdBy: 'system',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    // Template ID will be assigned by database
    // id: 'tpl-6',
    name: 'API Usage Report',
    description:
      'API endpoint usage statistics including request counts, response times, and error rates',
    category: 'analytics',
    dataSource: { type: 'api', endpoint: '/api/analytics/api-usage' },
    columns: [
      {
        id: 'c1',
        name: 'Endpoint',
        field: 'endpoint',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        id: 'c2',
        name: 'Method',
        field: 'method',
        type: 'string',
        sortable: true,
        filterable: true,
      },
      {
        id: 'c3',
        name: 'Total Requests',
        field: 'totalRequests',
        type: 'number',
        format: '0',
        sortable: true,
        aggregation: 'sum',
      },
      {
        id: 'c4',
        name: 'Avg Response (ms)',
        field: 'avgResponseTime',
        type: 'number',
        format: '0.00',
        sortable: true,
        aggregation: 'avg',
      },
      {
        id: 'c5',
        name: 'Error Rate',
        field: 'errorRate',
        type: 'number',
        format: '0.00%',
        sortable: true,
      },
      {
        id: 'c6',
        name: '2xx',
        field: 'status2xx',
        type: 'number',
        format: '0',
        aggregation: 'sum',
      },
      {
        id: 'c7',
        name: '4xx',
        field: 'status4xx',
        type: 'number',
        format: '0',
        aggregation: 'sum',
      },
      {
        id: 'c8',
        name: '5xx',
        field: 'status5xx',
        type: 'number',
        format: '0',
        aggregation: 'sum',
      },
    ],
    defaultSort: [{ field: 'totalRequests', direction: 'desc' }],
    visualization: { type: 'chart', chartType: 'bar' },
    createdBy: 'system',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

// Note: Executions and schedules are now stored in database
// No mock data needed - all data comes from LokiJS backend

// ============================================================================
// Input Types
// ============================================================================

export interface CreateReportTemplateInput {
  name: string
  description?: string
  category: string
  dataSource: ReportTemplate['dataSource']
  columns: ReportTemplate['columns']
  defaultFilters?: ReportFilter[]
  defaultSort?: ReportSort[]
  visualization?: ReportTemplate['visualization']
  tenantId?: string
  createdBy: string
}

export interface UpdateReportTemplateInput {
  name?: string
  description?: string
  category?: string
  dataSource?: ReportTemplate['dataSource']
  columns?: ReportTemplate['columns']
  defaultFilters?: ReportFilter[]
  defaultSort?: ReportSort[]
  visualization?: ReportTemplate['visualization']
}

export interface GetReportExecutionsOptions {
  status?: ReportStatus
  format?: ReportFormat
  limit?: number
  offset?: number
}

export interface CreateScheduleInput {
  frequency: ReportScheduleFrequency
  dayOfWeek?: number
  dayOfMonth?: number
  time: string
  timezone: string
  format: ReportFormat
  recipients: string[]
  enabled: boolean
  lastRun?: string
  nextRun?: string
}

export interface UpdateScheduleInput {
  frequency?: ReportScheduleFrequency
  dayOfWeek?: number
  dayOfMonth?: number
  time?: string
  timezone?: string
  format?: ReportFormat
  recipients?: string[]
  enabled?: boolean
}

// ============================================================================
// Template Functions (Server-side)
// ============================================================================

/**
 * Get all report templates, optionally filtered by tenantId
 */
export async function getTemplates(tenantId?: string): Promise<ReportTemplate[]> {
  const be = await getBackend()
  return be.getTemplates(tenantId)
}

/**
 * Get a report template by ID
 */
export async function getTemplateById(id: string): Promise<ReportTemplate> {
  const be = await getBackend()
  return be.getTemplateById(id)
}

/**
 * Create a new report template
 */
export async function createTemplate(input: CreateReportTemplateInput): Promise<ReportTemplate> {
  const be = await getBackend()
  return be.createTemplate(input)
}

/**
 * Update an existing report template
 */
export async function updateTemplate(
  id: string,
  updates: UpdateReportTemplateInput
): Promise<ReportTemplate> {
  const be = await getBackend()
  return be.updateTemplate(id, updates)
}

/**
 * Delete a report template
 */
export async function deleteTemplate(id: string): Promise<void> {
  const be = await getBackend()
  return be.deleteTemplate(id)
}

// ============================================================================
// Report Generation Functions (Server-side)
// ============================================================================

/**
 * Generate a report from a template
 */
export async function generateReport(
  input: GenerateReportInput,
  createdBy: string
): Promise<ReportExecution> {
  const be = await getBackend()
  return be.generateReport({ ...input, createdBy })
}

/**
 * Get a report execution by ID
 */
export async function getExecutionById(id: string): Promise<ReportExecution> {
  const be = await getBackend()
  return be.getExecutionById(id)
}

/**
 * Get report executions, optionally filtered by options
 */
export async function getExecutions(
  options?: GetReportExecutionsOptions
): Promise<ReportExecution[]> {
  const be = await getBackend()
  return be.getExecutions(options)
}

/**
 * Get execution file for download
 */
export async function getExecutionFile(id: string): Promise<{
  data: Uint8Array
  contentType: string
  filename: string
} | null> {
  const be = await getBackend()
  return be.getExecutionFile(id)
}

// ============================================================================
// Schedule Functions (Server-side)
// ============================================================================

/**
 * Get schedules for a report
 */
export async function getSchedules(reportId: string): Promise<ReportSchedule[]> {
  const be = await getBackend()
  return be.getSchedules(reportId)
}

/**
 * Get a schedule by ID
 */
export async function getScheduleById(id: string): Promise<ReportSchedule> {
  const be = await getBackend()
  return be.getScheduleById(id)
}

/**
 * Create a schedule for a report
 */
export async function createSchedule(
  reportId: string,
  schedule: CreateScheduleInput
): Promise<ReportSchedule> {
  const be = await getBackend()
  return be.createSchedule(reportId, schedule)
}

/**
 * Update a schedule
 */
export async function updateSchedule(
  scheduleId: string,
  updates: UpdateScheduleInput
): Promise<ReportSchedule> {
  const be = await getBackend()
  return be.updateSchedule(scheduleId, updates)
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const be = await getBackend()
  return be.deleteSchedule(scheduleId)
}

// ============================================================================
// Stats Functions (Server-side)
// ============================================================================

/**
 * Get report statistics
 */
export async function getReportStats(): Promise<ReportStats> {
  const be = await getBackend()
  return be.getReportStats()
}

/**
 * Seed default templates
 */
export async function seedDefaultTemplates(): Promise<void> {
  const be = await getBackend()
  return be.seedDefaultTemplates()
}

// ============================================================================
// Export convenience API object
// ============================================================================

export const reportsApi = {
  // Templates
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,

  // Generation & Executions
  generateReport,
  getExecutionById,
  getExecutions,
  getExecutionFile,

  // Schedules
  getSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,

  // Stats
  getReportStats,

  // Seed
  seedDefaultTemplates,
}
