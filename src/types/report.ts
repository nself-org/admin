// Report types for v0.7.0

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'html'
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'expired'
export type ReportScheduleFrequency = 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly'

export interface ReportColumn {
  id: string
  name: string
  field: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency'
  format?: string
  width?: number
  sortable?: boolean
  filterable?: boolean
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count'
}

export interface ReportFilter {
  field: string
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'in'
    | 'between'
  value: unknown
}

export interface ReportSort {
  field: string
  direction: 'asc' | 'desc'
}

export interface ReportDataSource {
  type: 'api' | 'database' | 'service'
  endpoint?: string
  query?: string
  parameters?: Record<string, unknown>
}

export interface ReportTemplate {
  id: string
  tenantId?: string
  name: string
  description?: string
  category: string
  dataSource: ReportDataSource
  columns: ReportColumn[]
  defaultFilters?: ReportFilter[]
  defaultSort?: ReportSort[]
  visualization?: {
    type: 'table' | 'chart' | 'summary'
    chartType?: 'bar' | 'line' | 'pie'
  }
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ReportSchedule {
  id: string
  reportId: string
  frequency: ReportScheduleFrequency
  dayOfWeek?: number // 0-6
  dayOfMonth?: number // 1-31
  time: string // HH:mm
  timezone: string
  format: ReportFormat
  recipients: string[]
  enabled: boolean
  lastRun?: string
  nextRun?: string
}

export interface ReportExecution {
  id: string
  reportId: string
  scheduleId?: string
  status: ReportStatus
  format: ReportFormat
  filters?: ReportFilter[]
  parameters?: Record<string, unknown>
  fileUrl?: string
  fileSize?: number
  rowCount?: number
  error?: string
  startedAt: string
  completedAt?: string
  expiresAt?: string
  createdBy: string
}

export interface Report {
  id: string
  template: ReportTemplate
  execution?: ReportExecution
  schedules?: ReportSchedule[]
}

export interface GenerateReportInput {
  templateId: string
  format: ReportFormat
  filters?: ReportFilter[]
  sort?: ReportSort[]
  parameters?: Record<string, unknown>
  email?: boolean
  recipients?: string[]
}

export interface ReportStats {
  totalTemplates: number
  totalExecutions: number
  totalScheduled: number
  byFormat: Record<ReportFormat, number>
  byStatus: Record<ReportStatus, number>
  recentExecutions: ReportExecution[]
}
