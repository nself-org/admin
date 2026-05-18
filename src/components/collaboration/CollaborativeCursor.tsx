/**
 * Collaborative Cursor Component
 * Displays remote user cursors in collaborative editing
 */
'use client'

import type { CursorPositionEvent } from '@/lib/websocket/events'

interface CollaborativeCursorProps {
  cursor: CursorPositionEvent
  editorRef?: React.RefObject<HTMLTextAreaElement | null>
}

export function CollaborativeCursor({ cursor }: CollaborativeCursorProps) {
  // This is a simplified cursor visualization
  // In a real implementation, this would calculate the actual pixel position
  // based on line and column numbers relative to the editor's scroll position

  return (
    <div
      className="pointer-events-none absolute z-50 transition-all duration-100"
      style={{
        left: `${cursor.position.column * 8}px`, // Approximate character width
        top: `${cursor.position.line * 20}px`, // Approximate line height
      }}
    >
      {/* Cursor line */}
      <div className="h-5 w-0.5 animate-pulse" style={{ backgroundColor: cursor.color }} />

      {/* User name label */}
      <div
        className="absolute -top-6 left-0 rounded px-1.5 py-0.5 text-xs whitespace-nowrap text-white shadow-sm"
        style={{ backgroundColor: cursor.color }}
      >
        {cursor.userName}
      </div>
    </div>
  )
}

interface CollaborativeSelectionProps {
  selection: {
    userId: string
    userName: string
    selection: {
      start: { line: number; column: number }
      end: { line: number; column: number }
    }
    color: string
  }
  editorRef?: React.RefObject<HTMLTextAreaElement | null>
}

export function CollaborativeSelection({ selection }: CollaborativeSelectionProps) {
  // Calculate selection bounds
  const start = selection.selection.start
  const end = selection.selection.end

  const top = Math.min(start.line, end.line) * 20
  const left = Math.min(start.column, end.column) * 8
  const height = (Math.abs(end.line - start.line) + 1) * 20
  const width = Math.abs(end.column - start.column) * 8

  return (
    <div
      className="pointer-events-none absolute transition-all duration-100"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: selection.color,
        opacity: 0.2,
      }}
      title={`Selected by ${selection.userName}`}
    />
  )
}
