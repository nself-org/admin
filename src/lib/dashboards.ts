import type {
  Dashboard,
  DashboardStats,
  Widget,
  WidgetTemplate,
  WidgetType,
} from '@/types/dashboard'
import crypto from 'crypto'
import { getDatabase, initDatabase } from './database'

// Collection reference
let dashboardsCollection: Collection<Dashboard> | null = null

// Initialize dashboards collection
async function ensureDashboardsCollection(): Promise<Collection<Dashboard>> {
  await initDatabase()
  const db = getDatabase()

  if (!db) {
    throw new Error('Database not initialized')
  }

  if (!dashboardsCollection) {
    dashboardsCollection =
      db.getCollection<Dashboard>('dashboards') ||
      db.addCollection<Dashboard>('dashboards', {
        unique: ['id'],
        indices: ['id', 'tenantId', 'createdBy'],
      })
  }

  return dashboardsCollection
}

// Generate unique ID
function generateId(): string {
  return crypto.randomBytes(12).toString('hex')
}

// Get all dashboards, optionally filtered by tenantId
export async function getDashboards(tenantId?: string): Promise<Dashboard[]> {
  const collection = await ensureDashboardsCollection()

  if (tenantId) {
    return collection.find({ tenantId }) || []
  }

  return collection.find() || []
}

// Get a single dashboard by ID
export async function getDashboard(id: string): Promise<Dashboard | null> {
  const collection = await ensureDashboardsCollection()
  return collection.findOne({ id }) || null
}

// Alias for getDashboard (for hook compatibility)
export const getDashboardById = getDashboard

// Create a new dashboard
export async function createDashboard(
  data: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt' | 'widgets'> & {
    widgets?: Widget[]
  }
): Promise<Dashboard> {
  const collection = await ensureDashboardsCollection()

  const now = new Date().toISOString()
  const dashboard: Dashboard = {
    id: generateId(),
    name: data.name,
    description: data.description,
    icon: data.icon,
    tenantId: data.tenantId,
    isDefault: data.isDefault ?? false,
    isPublic: data.isPublic ?? false,
    layout: data.layout ?? 'grid',
    columns: data.columns ?? 12,
    rowHeight: data.rowHeight ?? 80,
    widgets: data.widgets ?? [],
    filters: data.filters ?? [],
    variables: data.variables ?? [],
    refreshInterval: data.refreshInterval,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  }

  collection.insert(dashboard)
  getDatabase()?.saveDatabase()

  return dashboard
}

// Update an existing dashboard
export async function updateDashboard(
  id: string,
  data: Partial<Omit<Dashboard, 'id' | 'createdAt' | 'createdBy'>>
): Promise<Dashboard | null> {
  const collection = await ensureDashboardsCollection()
  const dashboard = collection.findOne({ id })

  if (!dashboard) {
    return null
  }

  // Update fields
  if (data.name !== undefined) dashboard.name = data.name
  if (data.description !== undefined) dashboard.description = data.description
  if (data.icon !== undefined) dashboard.icon = data.icon
  if (data.tenantId !== undefined) dashboard.tenantId = data.tenantId
  if (data.isDefault !== undefined) dashboard.isDefault = data.isDefault
  if (data.isPublic !== undefined) dashboard.isPublic = data.isPublic
  if (data.layout !== undefined) dashboard.layout = data.layout
  if (data.columns !== undefined) dashboard.columns = data.columns
  if (data.rowHeight !== undefined) dashboard.rowHeight = data.rowHeight
  if (data.widgets !== undefined) dashboard.widgets = data.widgets
  if (data.filters !== undefined) dashboard.filters = data.filters
  if (data.variables !== undefined) dashboard.variables = data.variables
  if (data.refreshInterval !== undefined) dashboard.refreshInterval = data.refreshInterval

  dashboard.updatedAt = new Date().toISOString()

  collection.update(dashboard)
  getDatabase()?.saveDatabase()

  return dashboard
}

// Delete a dashboard
export async function deleteDashboard(id: string): Promise<boolean> {
  const collection = await ensureDashboardsCollection()
  const dashboard = collection.findOne({ id })

  if (!dashboard) {
    return false
  }

  collection.remove(dashboard)
  getDatabase()?.saveDatabase()

  return true
}

// Add a widget to a dashboard
export async function addWidget(
  dashboardId: string,
  widget: Omit<Widget, 'id'>
): Promise<Widget | null> {
  const collection = await ensureDashboardsCollection()
  const dashboard = collection.findOne({ id: dashboardId })

  if (!dashboard) {
    return null
  }

  const newWidget: Widget = {
    ...widget,
    id: generateId(),
  }

  dashboard.widgets.push(newWidget)
  dashboard.updatedAt = new Date().toISOString()

  collection.update(dashboard)
  getDatabase()?.saveDatabase()

  return newWidget
}

// Update a widget in a dashboard
export async function updateWidget(
  dashboardId: string,
  widgetId: string,
  data: Partial<Omit<Widget, 'id'>>
): Promise<Widget | null> {
  const collection = await ensureDashboardsCollection()
  const dashboard = collection.findOne({ id: dashboardId })

  if (!dashboard) {
    return null
  }

  const widgetIndex = dashboard.widgets.findIndex((w) => w.id === widgetId)
  if (widgetIndex === -1) {
    return null
  }

  const widget = dashboard.widgets[widgetIndex]
  if (!widget) return null

  // Update widget fields
  if (data.type !== undefined) widget.type = data.type
  if (data.position !== undefined) widget.position = data.position
  if (data.config !== undefined) widget.config = data.config

  dashboard.widgets[widgetIndex] = widget
  dashboard.updatedAt = new Date().toISOString()

  collection.update(dashboard)
  getDatabase()?.saveDatabase()

  return widget
}

// Delete a widget from a dashboard
export async function deleteWidget(dashboardId: string, widgetId: string): Promise<boolean> {
  const collection = await ensureDashboardsCollection()
  const dashboard = collection.findOne({ id: dashboardId })

  if (!dashboard) {
    return false
  }

  const initialLength = dashboard.widgets.length
  dashboard.widgets = dashboard.widgets.filter((w) => w.id !== widgetId)

  if (dashboard.widgets.length === initialLength) {
    return false
  }

  dashboard.updatedAt = new Date().toISOString()

  collection.update(dashboard)
  getDatabase()?.saveDatabase()

  return true
}

// Alias for deleteWidget (for hook compatibility)
export const removeWidget = deleteWidget

// Clone a dashboard
export async function cloneDashboard(
  id: string,
  newName?: string,
  newTenantId?: string,
  createdBy?: string
): Promise<Dashboard | null> {
  const collection = await ensureDashboardsCollection()
  const original = collection.findOne({ id })

  if (!original) {
    return null
  }

  const now = new Date().toISOString()
  const cloned: Dashboard = {
    ...original,
    id: generateId(),
    name: newName ?? `${original.name} (Copy)`,
    tenantId: newTenantId ?? original.tenantId,
    isDefault: false, // Cloned dashboards are never default
    createdBy: createdBy ?? original.createdBy,
    createdAt: now,
    updatedAt: now,
    // Clone widgets with new IDs
    widgets: original.widgets.map((widget) => ({
      ...widget,
      id: generateId(),
    })),
  }

  collection.insert(cloned)
  getDatabase()?.saveDatabase()

  return cloned
}

// Get unique widget categories
export function getWidgetCategories(): string[] {
  const templates = getWidgetTemplates()
  const categories = new Set(templates.map((t) => t.category))
  return Array.from(categories).sort()
}

// Get widget templates filtered by category
export function getWidgetTemplatesByCategory(category: string): WidgetTemplate[] {
  const templates = getWidgetTemplates()
  return templates.filter((t) => t.category === category)
}

// Get widget templates
export function getWidgetTemplates(): WidgetTemplate[] {
  return [
    {
      id: 'metric-simple',
      name: 'Simple Metric',
      description: 'Display a single value with optional trend indicator',
      category: 'Metrics',
      type: 'metric',
      defaultConfig: {
        title: 'Metric',
        dataSource: { type: 'api', endpoint: '/api/metrics/value' },
      },
      defaultSize: { w: 3, h: 2 },
    },
    {
      id: 'chart-line',
      name: 'Line Chart',
      description: 'Time series data visualization',
      category: 'Charts',
      type: 'chart',
      defaultConfig: {
        title: 'Line Chart',
        dataSource: { type: 'api', endpoint: '/api/metrics/timeseries' },
        visualization: { chartType: 'line', showLegend: true, showGrid: true },
      },
      defaultSize: { w: 6, h: 4 },
    },
    {
      id: 'chart-bar',
      name: 'Bar Chart',
      description: 'Compare values across categories',
      category: 'Charts',
      type: 'chart',
      defaultConfig: {
        title: 'Bar Chart',
        dataSource: { type: 'api', endpoint: '/api/metrics/categories' },
        visualization: { chartType: 'bar', showLegend: true, showGrid: true },
      },
      defaultSize: { w: 6, h: 4 },
    },
    {
      id: 'chart-pie',
      name: 'Pie Chart',
      description: 'Show proportional data',
      category: 'Charts',
      type: 'chart',
      defaultConfig: {
        title: 'Pie Chart',
        dataSource: { type: 'api', endpoint: '/api/metrics/distribution' },
        visualization: { chartType: 'pie', showLegend: true },
      },
      defaultSize: { w: 4, h: 4 },
    },
    {
      id: 'chart-area',
      name: 'Area Chart',
      description: 'Stacked time series visualization',
      category: 'Charts',
      type: 'chart',
      defaultConfig: {
        title: 'Area Chart',
        dataSource: { type: 'api', endpoint: '/api/metrics/timeseries' },
        visualization: {
          chartType: 'area',
          showLegend: true,
          showGrid: true,
          stacked: true,
        },
      },
      defaultSize: { w: 6, h: 4 },
    },
    {
      id: 'table-simple',
      name: 'Data Table',
      description: 'Tabular data display with sorting',
      category: 'Tables',
      type: 'table',
      defaultConfig: {
        title: 'Data Table',
        dataSource: { type: 'api', endpoint: '/api/data/list' },
      },
      defaultSize: { w: 6, h: 4 },
    },
    {
      id: 'list-simple',
      name: 'List',
      description: 'Scrollable list of items',
      category: 'Lists',
      type: 'list',
      defaultConfig: {
        title: 'List',
        dataSource: { type: 'api', endpoint: '/api/data/items' },
      },
      defaultSize: { w: 4, h: 4 },
    },
    {
      id: 'gauge-simple',
      name: 'Gauge',
      description: 'Display a value on a gauge scale',
      category: 'Metrics',
      type: 'gauge',
      defaultConfig: {
        title: 'Gauge',
        dataSource: { type: 'api', endpoint: '/api/metrics/gauge' },
        thresholds: { warning: 70, critical: 90 },
      },
      defaultSize: { w: 3, h: 3 },
    },
    {
      id: 'progress-simple',
      name: 'Progress Bar',
      description: 'Show completion or usage percentage',
      category: 'Metrics',
      type: 'progress',
      defaultConfig: {
        title: 'Progress',
        dataSource: { type: 'api', endpoint: '/api/metrics/progress' },
      },
      defaultSize: { w: 4, h: 2 },
    },
    {
      id: 'status-simple',
      name: 'Status Indicator',
      description: 'Show service or system status',
      category: 'Status',
      type: 'status',
      defaultConfig: {
        title: 'Status',
        dataSource: { type: 'api', endpoint: '/api/health' },
      },
      defaultSize: { w: 2, h: 2 },
    },
    {
      id: 'timeline-events',
      name: 'Timeline',
      description: 'Display events in chronological order',
      category: 'Timelines',
      type: 'timeline',
      defaultConfig: {
        title: 'Timeline',
        dataSource: { type: 'api', endpoint: '/api/events' },
      },
      defaultSize: { w: 4, h: 6 },
    },
    {
      id: 'text-markdown',
      name: 'Text / Markdown',
      description: 'Display static text or markdown content',
      category: 'Content',
      type: 'text',
      defaultConfig: {
        title: 'Text',
        dataSource: { type: 'static' },
      },
      defaultSize: { w: 4, h: 3 },
    },
    {
      id: 'embed-iframe',
      name: 'Embed',
      description: 'Embed external content via iframe',
      category: 'Content',
      type: 'embed',
      defaultConfig: {
        title: 'Embed',
        dataSource: { type: 'static' },
      },
      defaultSize: { w: 6, h: 4 },
    },
  ]
}

// Get dashboard statistics
export async function getDashboardStats(tenantId?: string): Promise<DashboardStats> {
  const dashboards = await getDashboards(tenantId)

  const byType: Record<WidgetType, number> = {
    metric: 0,
    chart: 0,
    table: 0,
    list: 0,
    map: 0,
    gauge: 0,
    progress: 0,
    status: 0,
    timeline: 0,
    calendar: 0,
    text: 0,
    embed: 0,
  }

  let totalWidgets = 0

  for (const dashboard of dashboards) {
    for (const widget of dashboard.widgets) {
      totalWidgets++
      if (widget.type in byType) {
        byType[widget.type]++
      }
    }
  }

  // For mostViewed, we would need view tracking - for now return empty
  // This could be enhanced later with a views collection
  const mostViewed: { id: string; name: string; views: number }[] = dashboards
    .slice(0, 5)
    .map((d) => ({
      id: d.id,
      name: d.name,
      views: 0, // Placeholder - would need view tracking
    }))

  return {
    totalDashboards: dashboards.length,
    totalWidgets,
    byType,
    mostViewed,
  }
}
