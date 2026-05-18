'use client'

import { Button } from '@/components/ui/button'
import type { WorkflowAction, WorkflowConnection } from '@/types/workflow'
import { Plus, ZoomIn, ZoomOut } from 'lucide-react'
import * as React from 'react'
import { WorkflowNode } from './WorkflowNode'

interface WorkflowCanvasProps {
  actions: WorkflowAction[]
  connections: WorkflowConnection[]
  onActionSelect?: (action: WorkflowAction) => void
  onActionMove?: (actionId: string, position: { x: number; y: number }) => void
  onActionDelete?: (actionId: string) => void
  onConnectionCreate?: (connection: Omit<WorkflowConnection, 'id'>) => void
  onConnectionDelete?: (connectionId: string) => void
  onAddAction?: () => void
}

interface CanvasState {
  zoom: number
  panX: number
  panY: number
  dragging: string | null
  connecting: {
    sourceId: string
    sourcePort: string
  } | null
  mousePos: { x: number; y: number }
}

export function WorkflowCanvas({
  actions,
  connections,
  onActionSelect,
  onActionMove,
  onActionDelete,
  onConnectionCreate,
  onConnectionDelete,
  onAddAction,
}: WorkflowCanvasProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null)
  const svgRef = React.useRef<SVGSVGElement>(null)
  const [state, setState] = React.useState<CanvasState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    dragging: null,
    connecting: null,
    mousePos: { x: 0, y: 0 },
  })

  const handleZoomIn = () => {
    setState((prev) => ({ ...prev, zoom: Math.min(prev.zoom + 0.1, 2) }))
  }

  const handleZoomOut = () => {
    setState((prev) => ({ ...prev, zoom: Math.max(prev.zoom - 0.1, 0.5) }))
  }

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - state.panX) / state.zoom
      const y = (e.clientY - rect.top - state.panY) / state.zoom

      setState((prev) => ({ ...prev, mousePos: { x, y } }))

      if (state.dragging) {
        onActionMove?.(state.dragging, { x, y })
      }
    },
    [state.dragging, state.panX, state.panY, state.zoom, onActionMove]
  )

  const handleMouseUp = React.useCallback(() => {
    setState((prev) => ({ ...prev, dragging: null, connecting: null }))
  }, [])

  const handleNodeDragStart = React.useCallback((actionId: string) => {
    setState((prev) => ({ ...prev, dragging: actionId }))
  }, [])

  const handlePortDragStart = React.useCallback((actionId: string, port: string) => {
    setState((prev) => ({
      ...prev,
      connecting: { sourceId: actionId, sourcePort: port },
    }))
  }, [])

  const handlePortDrop = React.useCallback(
    (targetId: string, targetPort: string) => {
      if (state.connecting && state.connecting.sourceId !== targetId) {
        onConnectionCreate?.({
          sourceId: state.connecting.sourceId,
          sourcePort: state.connecting.sourcePort,
          targetId,
          targetPort,
        })
      }
      setState((prev) => ({ ...prev, connecting: null }))
    },
    [state.connecting, onConnectionCreate]
  )

  const getNodePosition = (actionId: string) => {
    const action = actions.find((a) => a.id === actionId)
    return action?.position ?? { x: 0, y: 0 }
  }

  const renderConnection = (connection: WorkflowConnection) => {
    const sourcePos = getNodePosition(connection.sourceId)
    const targetPos = getNodePosition(connection.targetId)

    const nodeWidth = 200
    const nodeHeight = 80

    const startX = sourcePos.x + nodeWidth
    const startY = sourcePos.y + nodeHeight / 2
    const endX = targetPos.x
    const endY = targetPos.y + nodeHeight / 2

    const controlPointOffset = Math.abs(endX - startX) / 2

    const path = `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`

    return (
      <g key={connection.id} className="group/connection">
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-zinc-300 transition-colors group-hover/connection:text-zinc-500 dark:text-zinc-700 dark:group-hover/connection:text-zinc-500"
        />
        {/* Click target for deletion */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth="16"
          className="cursor-pointer"
          onClick={() => onConnectionDelete?.(connection.id)}
        />
      </g>
    )
  }

  const renderConnectingLine = () => {
    if (!state.connecting) return null

    const sourcePos = getNodePosition(state.connecting.sourceId)
    const nodeWidth = 200
    const nodeHeight = 80

    const startX = sourcePos.x + nodeWidth
    const startY = sourcePos.y + nodeHeight / 2

    return (
      <line
        x1={startX}
        y1={startY}
        x2={state.mousePos.x}
        y2={state.mousePos.y}
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="5,5"
        className="pointer-events-none text-blue-500"
      />
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button variant="outline" size="icon" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="flex items-center rounded-md border bg-white px-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          {Math.round(state.zoom * 100)}%
        </span>
      </div>

      {/* Add action button */}
      <div className="absolute top-4 right-4 z-10">
        <Button onClick={onAddAction}>
          <Plus className="mr-2 h-4 w-4" />
          Add Action
        </Button>
      </div>

      {/* Canvas area */}
      <div
        ref={canvasRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`,
            transformOrigin: '0 0',
          }}
          className="relative h-full w-full"
        >
          {/* Grid background */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgb(228 228 231 / 0.5) 1px, transparent 1px),
                linear-gradient(to bottom, rgb(228 228 231 / 0.5) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />

          {/* SVG layer for connections */}
          <svg
            ref={svgRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ overflow: 'visible' }}
          >
            {connections.map(renderConnection)}
            {renderConnectingLine()}
          </svg>

          {/* Nodes */}
          {actions.map((action) => (
            <WorkflowNode
              key={action.id}
              action={action}
              onSelect={() => onActionSelect?.(action)}
              onDelete={() => onActionDelete?.(action.id)}
              onDragStart={() => handleNodeDragStart(action.id)}
              onPortDragStart={(port) => handlePortDragStart(action.id, port)}
              onPortDrop={(port) => handlePortDrop(action.id, port)}
            />
          ))}

          {/* Empty state */}
          {actions.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="mb-4 text-zinc-500 dark:text-zinc-400">
                  Start building your workflow
                </p>
                <Button onClick={onAddAction}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Action
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
