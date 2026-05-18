'use client'

import type { Widget } from '@/types/dashboard'
import { ChartWidget } from './ChartWidget'
import { MetricWidget } from './MetricWidget'
import { TableWidget } from './TableWidget'

interface WidgetRendererProps {
  widget: Widget
}

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  switch (widget.type) {
    case 'metric':
      return <MetricWidget widget={widget} />

    case 'chart':
      return <ChartWidget widget={widget} />

    case 'table':
      return <TableWidget widget={widget} />

    case 'gauge':
      return <GaugeWidget widget={widget} />

    case 'progress':
      return <ProgressWidget widget={widget} />

    case 'status':
      return <StatusWidget widget={widget} />

    case 'list':
      return <ListWidget widget={widget} />

    case 'text':
      return <TextWidget widget={widget} />

    case 'timeline':
      return <TimelineWidget widget={widget} />

    case 'calendar':
      return <CalendarWidget widget={widget} />

    case 'map':
      return <MapWidget widget={widget} />

    case 'embed':
      return <EmbedWidget widget={widget} />

    default:
      return <UnsupportedWidget type={widget.type} />
  }
}

// Simple placeholder widgets for types not yet fully implemented

function GaugeWidget({ widget }: { widget: Widget }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="relative mx-auto h-24 w-24">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-zinc-200 dark:text-zinc-700"
            />
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="75, 100"
              className="text-blue-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold">75%</span>
          </div>
        </div>
        {widget.config.title && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{widget.config.title}</p>
        )}
      </div>
    </div>
  )
}

function ProgressWidget({ widget }: { widget: Widget }) {
  return (
    <div className="flex h-full flex-col justify-center space-y-3 p-4">
      {widget.config.title && (
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {widget.config.title}
        </p>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: '65%' }} />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">65% complete</p>
    </div>
  )
}

function StatusWidget({ widget }: { widget: Widget }) {
  const statuses = [
    { name: 'API Server', status: 'healthy' },
    { name: 'Database', status: 'healthy' },
    { name: 'Cache', status: 'warning' },
    { name: 'Queue', status: 'healthy' },
  ]

  const statusColors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
    unknown: 'bg-zinc-400',
  }

  return (
    <div className="h-full p-4">
      {widget.config.title && (
        <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {widget.config.title}
        </p>
      )}
      <div className="space-y-2">
        {statuses.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{item.name}</span>
            <span
              className={`h-2 w-2 rounded-full ${statusColors[item.status as keyof typeof statusColors] || statusColors.unknown}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function ListWidget({ widget }: { widget: Widget }) {
  const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5']

  return (
    <div className="h-full overflow-auto p-4">
      {widget.config.title && (
        <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {widget.config.title}
        </p>
      )}
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function TextWidget({ widget }: { widget: Widget }) {
  return (
    <div className="flex h-full flex-col p-4">
      {widget.config.title && (
        <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {widget.config.title}
        </p>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {widget.config.subtitle ||
          'Add text content to display notes, instructions, or other information.'}
      </p>
    </div>
  )
}

function TimelineWidget({ widget }: { widget: Widget }) {
  const events = [
    { time: '10:30', event: 'Deployment started' },
    { time: '10:32', event: 'Build completed' },
    { time: '10:35', event: 'Tests passed' },
    { time: '10:36', event: 'Deployed to production' },
  ]

  return (
    <div className="h-full overflow-auto p-4">
      {widget.config.title && (
        <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {widget.config.title}
        </p>
      )}
      <div className="relative space-y-3 pl-4">
        <div className="absolute top-0 bottom-0 left-1 w-px bg-zinc-200 dark:bg-zinc-700" />
        {events.map((item, index) => (
          <div key={index} className="relative flex gap-3">
            <div className="absolute top-1.5 -left-3 h-2 w-2 rounded-full bg-blue-500" />
            <span className="shrink-0 text-xs text-zinc-400">{item.time}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{item.event}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalendarWidget({ widget }: { widget: Widget }) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="text-center">
        <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
          {new Date().getDate()}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
          })}
        </p>
        {widget.config.title && <p className="mt-2 text-xs text-zinc-400">{widget.config.title}</p>}
      </div>
    </div>
  )
}

function MapWidget({ widget }: { widget: Widget }) {
  return (
    <div className="flex h-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
      <div className="text-center">
        <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {widget.config.title || 'Map Widget'}
        </p>
        <p className="text-xs text-zinc-400">Map visualization placeholder</p>
      </div>
    </div>
  )
}

function EmbedWidget({ widget }: { widget: Widget }) {
  const endpoint = widget.config.dataSource?.endpoint

  if (endpoint) {
    return (
      <iframe
        src={endpoint}
        className="h-full w-full border-0"
        title={widget.config.title || 'Embedded content'}
        sandbox="allow-scripts allow-same-origin"
      />
    )
  }

  return (
    <div className="flex h-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
      <div className="text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {widget.config.title || 'Embed Widget'}
        </p>
        <p className="text-xs text-zinc-400">Configure a URL to embed</p>
      </div>
    </div>
  )
}

function UnsupportedWidget({ type }: { type: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Unsupported Widget</p>
        <p className="text-xs text-zinc-400">Type: {type}</p>
      </div>
    </div>
  )
}
