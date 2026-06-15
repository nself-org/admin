'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { WidgetTemplate, WidgetType } from '@/types/dashboard'
import {
  Activity,
  Calendar,
  Code,
  FileText,
  Gauge,
  Globe,
  Hash,
  LineChart,
  List,
  Map,
  Search,
  Table2,
  Timer,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'

// Widget template icons by type
const widgetIcons: Record<WidgetType, React.ComponentType<{ className?: string }>> = {
  metric: Hash,
  chart: LineChart,
  table: Table2,
  list: List,
  map: Map,
  gauge: Gauge,
  progress: Activity,
  status: Activity,
  timeline: Timer,
  calendar: Calendar,
  text: FileText,
  embed: Code,
}

// Default widget templates
const defaultTemplates: WidgetTemplate[] = [
  // Metric widgets
  {
    id: 'metric-basic',
    name: 'Basic Metric',
    description: 'Display a single value with optional trend indicator',
    category: 'Metrics',
    type: 'metric',
    defaultConfig: {
      title: 'Metric',
      dataSource: { type: 'api' },
    },
    defaultSize: { w: 3, h: 2 },
  },
  {
    id: 'metric-trend',
    name: 'Metric with Trend',
    description: 'Show a metric with percentage change and trend arrow',
    category: 'Metrics',
    type: 'metric',
    defaultConfig: {
      title: 'Trending Metric',
      dataSource: { type: 'api' },
    },
    defaultSize: { w: 3, h: 2 },
  },

  // Chart widgets
  {
    id: 'chart-line',
    name: 'Line Chart',
    description: 'Visualize trends over time with a line chart',
    category: 'Charts',
    type: 'chart',
    defaultConfig: {
      title: 'Line Chart',
      visualization: { chartType: 'line', showGrid: true, showLegend: true },
      dataSource: { type: 'api' },
    },
    defaultSize: { w: 6, h: 4 },
  },
  {
    id: 'chart-bar',
    name: 'Bar Chart',
    description: 'Compare values across categories with a bar chart',
    category: 'Charts',
    type: 'chart',
    defaultConfig: {
      title: 'Bar Chart',
      visualization: { chartType: 'bar', showGrid: true, showLegend: true },
      dataSource: { type: 'api' },
    },
    defaultSize: { w: 6, h: 4 },
  },
  {
    id: 'chart-pie',
    name: 'Pie Chart',
    description: 'Show proportions and percentages with a pie chart',
    category: 'Charts',
    type: 'chart',
    defaultConfig: {
      title: 'Pie Chart',
      visualization: { chartType: 'pie', showLegend: true },
      dataSource: { type: 'api' },
    },
    defaultSize: { w: 4, h: 4 },
  },
  {
    id: 'chart-area',
    name: 'Area Chart',
    description: 'Display cumulative values with filled area',
    category: 'Charts',
    type: 'chart',
    defaultConfig: {
      title: 'Area Chart',
      visualization: { chartType: 'area', showGrid: true, showLegend: true },
      dataSource: { type: 'api' },
    },
    defaultSize: { w: 6, h: 4 },
  },

  // Table widgets
  {
    id: 'table-basic',
    name: 'Data Table',
    description: 'Display tabular data with sorting and filtering',
    category: 'Tables',
    type: 'table',
    defaultConfig: {
      title: 'Data Table',
      dataSource: { type: 'api' },
    },
    defaultSize: { w: 6, h: 4 },
  },

  // Status widgets
  {
    id: 'status-grid',
    name: 'Status Grid',
    description: 'Show status indicators for multiple services',
    category: 'Status',
    type: 'status',
    defaultConfig: {
      title: 'Service Status',
      dataSource: { type: 'api' },
    },
    defaultSize: { w: 3, h: 3 },
  },
  {
    id: 'gauge-basic',
    name: 'Gauge',
    description: 'Display a value on a circular gauge',
    category: 'Status',
    type: 'gauge',
    defaultConfig: {
      title: 'Gauge',
      dataSource: { type: 'api' },
    },
    defaultSize: { w: 3, h: 3 },
  },
  {
    id: 'progress-bar',
    name: 'Progress Bar',
    description: 'Show progress towards a goal',
    category: 'Status',
    type: 'progress',
    defaultConfig: {
      title: 'Progress',
      dataSource: { type: 'api' },
    },
    defaultSize: { w: 4, h: 2 },
  },

  // Timeline widgets
  {
    id: 'timeline-events',
    name: 'Event Timeline',
    description: 'Display chronological events and activities',
    category: 'Activity',
    type: 'timeline',
    defaultConfig: {
      title: 'Recent Events',
      dataSource: { type: 'api' },
    },
    defaultSize: { w: 4, h: 4 },
  },
  {
    id: 'list-basic',
    name: 'List',
    description: 'Display a simple list of items',
    category: 'Activity',
    type: 'list',
    defaultConfig: {
      title: 'List',
      dataSource: { type: 'api' },
    },
    defaultSize: { w: 3, h: 3 },
  },

  // Other widgets
  {
    id: 'calendar-date',
    name: 'Calendar',
    description: 'Show current date and upcoming events',
    category: 'Other',
    type: 'calendar',
    defaultConfig: {
      title: 'Calendar',
      dataSource: { type: 'static' },
    },
    defaultSize: { w: 3, h: 3 },
  },
  {
    id: 'text-markdown',
    name: 'Text Block',
    description: 'Add notes, instructions, or documentation',
    category: 'Other',
    type: 'text',
    defaultConfig: {
      title: 'Notes',
      subtitle: 'Add your text content here',
      dataSource: { type: 'static' },
    },
    defaultSize: { w: 4, h: 2 },
  },
  {
    id: 'embed-iframe',
    name: 'Embed',
    description: 'Embed external content via iframe',
    category: 'Other',
    type: 'embed',
    defaultConfig: {
      title: 'Embedded Content',
      dataSource: { type: 'static', endpoint: '' },
    },
    defaultSize: { w: 6, h: 4 },
  },
  {
    id: 'map-location',
    name: 'Map',
    description: 'Display geographic data on a map',
    category: 'Other',
    type: 'map',
    defaultConfig: {
      title: 'Map',
      dataSource: { type: 'api' },
    },
    defaultSize: { w: 6, h: 4 },
  },
]

interface WidgetLibraryProps {
  templates?: WidgetTemplate[]
  onSelect: (template: WidgetTemplate) => void
  onClose?: () => void
  className?: string
}

export function WidgetLibrary({
  templates = defaultTemplates,
  onSelect,
  onClose,
  className,
}: WidgetLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category))
    return Array.from(cats).sort()
  }, [templates])

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || template.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [templates, searchQuery, selectedCategory])

  // Group templates by category for display
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, WidgetTemplate[]> = {}
    filteredTemplates.forEach((template) => {
      if (!groups[template.category]) {
        groups[template.category] = []
      }
      groups[template.category]?.push(template)
    })
    return groups
  }, [filteredTemplates])

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Widget Library</h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="border-b p-4 dark:border-zinc-800">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search widgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 border-b p-4 dark:border-zinc-800">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-auto p-4">
        {Object.keys(groupedTemplates).length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Globe className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700" />
              <p className="mt-2 text-sm text-zinc-500">No widgets found</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
              <div key={category}>
                <h3 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {category}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {categoryTemplates.map((template) => {
                    const Icon = widgetIcons[template.type] || Hash
                    return (
                      <button
                        key={template.id}
                        onClick={() => onSelect(template)}
                        className="group flex flex-col items-center rounded-lg border border-zinc-200 bg-white p-4 text-center transition-all hover:border-blue-500 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-blue-500"
                      >
                        <div className="mb-3 rounded-lg bg-zinc-100 p-3 transition-colors group-hover:bg-blue-50 dark:bg-zinc-800 dark:group-hover:bg-blue-950/50">
                          <Icon className="h-6 w-6 text-zinc-600 group-hover:text-blue-600 dark:text-zinc-400 dark:group-hover:text-blue-400" />
                        </div>
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {template.name}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {template.description}
                        </p>
                        <div className="mt-2 text-xs text-zinc-400">
                          {template.defaultSize.w}x{template.defaultSize.h}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Export the icon map for external use
export { widgetIcons }
