'use client'

import type { Dashboard, Widget, WidgetPosition } from '@/types/dashboard'
import { WidgetCard } from './WidgetCard'
import { WidgetRenderer } from './WidgetRenderer'

interface DashboardGridProps {
  dashboard: Dashboard
  editable?: boolean
  onWidgetUpdate?: (widgetId: string, position: WidgetPosition) => void
  onWidgetRemove?: (widgetId: string) => void
  onWidgetEdit?: (widget: Widget) => void
}

export function DashboardGrid({
  dashboard,
  editable = false,
  onWidgetUpdate,
  onWidgetRemove,
  onWidgetEdit,
}: DashboardGridProps) {
  const columns = dashboard.columns || 12
  const rowHeight = dashboard.rowHeight || 80

  // Calculate widget style based on position
  const getWidgetStyle = (position: WidgetPosition) => {
    return {
      gridColumn: `${position.x + 1} / span ${position.w}`,
      gridRow: `${position.y + 1} / span ${position.h}`,
      minHeight: position.h * rowHeight,
    }
  }

  // Handle drag start for repositioning
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, widget: Widget) => {
    if (!editable) return
    e.dataTransfer.setData('widgetId', widget.id)
    e.dataTransfer.setData('widgetPosition', JSON.stringify(widget.position))
    e.dataTransfer.effectAllowed = 'move'
  }

  // Handle drop for repositioning
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetX: number, targetY: number) => {
    if (!editable || !onWidgetUpdate) return
    e.preventDefault()
    const widgetId = e.dataTransfer.getData('widgetId')
    const oldPosition = JSON.parse(e.dataTransfer.getData('widgetPosition')) as WidgetPosition
    const newPosition: WidgetPosition = {
      ...oldPosition,
      x: Math.max(0, Math.min(targetX, columns - oldPosition.w)),
      y: Math.max(0, targetY),
    }
    onWidgetUpdate(widgetId, newPosition)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!editable) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  if (dashboard.widgets.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="text-center">
          <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
            No widgets added yet
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
            {editable ? 'Click "Add Widget" to get started' : 'This dashboard is empty'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridAutoRows: `minmax(${rowHeight}px, auto)`,
      }}
      onDragOver={handleDragOver}
      onDrop={(e) => {
        // Calculate drop position based on mouse position
        const rect = e.currentTarget.getBoundingClientRect()
        const colWidth = rect.width / columns
        const targetX = Math.floor((e.clientX - rect.left) / colWidth)
        const targetY = Math.floor((e.clientY - rect.top) / rowHeight)
        handleDrop(e, targetX, targetY)
      }}
    >
      {dashboard.widgets.map((widget) => (
        <div
          key={widget.id}
          style={getWidgetStyle(widget.position)}
          draggable={editable}
          onDragStart={(e) => handleDragStart(e, widget)}
          className={editable ? 'cursor-move' : ''}
        >
          <WidgetCard
            widget={widget}
            editable={editable}
            onRemove={() => onWidgetRemove?.(widget.id)}
            onEdit={() => onWidgetEdit?.(widget)}
          >
            <WidgetRenderer widget={widget} />
          </WidgetCard>
        </div>
      ))}
    </div>
  )
}
