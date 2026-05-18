// Dashboard types for v0.7.0

export type WidgetType =
  | 'metric'
  | 'chart'
  | 'table'
  | 'list'
  | 'map'
  | 'gauge'
  | 'progress'
  | 'status'
  | 'timeline'
  | 'calendar'
  | 'text'
  | 'embed'

export type ChartType = 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter' | 'heatmap'

export type DataSourceType = 'api' | 'database' | 'static' | 'formula'

export interface WidgetPosition {
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
}

export interface WidgetDataSource {
  type: DataSourceType
  endpoint?: string
  query?: string
  refreshInterval?: number // seconds
  transform?: string // JS expression
}

export interface WidgetConfig {
  title?: string
  subtitle?: string
  icon?: string
  color?: string
  dataSource: WidgetDataSource
  visualization?: {
    chartType?: ChartType
    showLegend?: boolean
    showGrid?: boolean
    stacked?: boolean
    colors?: string[]
  }
  thresholds?: {
    warning?: number
    critical?: number
  }
}

export interface Widget {
  id: string
  type: WidgetType
  position: WidgetPosition
  config: WidgetConfig
}

export interface Dashboard {
  id: string
  tenantId?: string
  name: string
  description?: string
  icon?: string
  isDefault?: boolean
  isPublic?: boolean
  layout: 'grid' | 'free'
  columns?: number
  rowHeight?: number
  widgets: Widget[]
  filters?: DashboardFilter[]
  variables?: DashboardVariable[]
  refreshInterval?: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface DashboardFilter {
  id: string
  name: string
  type: 'select' | 'date' | 'daterange' | 'search'
  options?: { label: string; value: string }[]
  defaultValue?: unknown
}

export interface DashboardVariable {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean'
  defaultValue?: unknown
  query?: string
}

export interface WidgetTemplate {
  id: string
  name: string
  description: string
  category: string
  type: WidgetType
  thumbnail?: string
  defaultConfig: Partial<WidgetConfig>
  defaultSize: { w: number; h: number }
}

export interface DashboardStats {
  totalDashboards: number
  totalWidgets: number
  byType: Record<WidgetType, number>
  mostViewed: { id: string; name: string; views: number }[]
}
