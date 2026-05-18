/**
 * Collaborative Editor Component
 * Real-time collaborative text editor with cursor sync, selections, and conflict resolution
 */
'use client'

import { useCollaborativeEditor } from '@/hooks/useCollaboration'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CollaborativeCursor, CollaborativeSelection } from './CollaborativeCursor'
import { TypingIndicator } from './TypingIndicator'

interface CollaborativeEditorProps {
  documentId: string
  initialContent?: string
  onChange?: (content: string) => void
  readOnly?: boolean
  className?: string
  placeholder?: string
}

export function CollaborativeEditor({
  documentId,
  initialContent = '',
  onChange,
  readOnly = false,
  className = '',
  placeholder = 'Start typing...',
}: CollaborativeEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [cursorPosition, setCursorPosition] = useState({ line: 0, column: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const { cursors, selections, typingUsers, updateCursor, updateSelection, setTyping, applyEdit } =
    useCollaborativeEditor(documentId, `document-${documentId}`)

  // Update content when it changes
  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  // Handle text changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value
      const oldContent = content

      setContent(newContent)
      onChange?.(newContent)

      // Determine what changed
      const diff = findDiff(oldContent, newContent)
      if (diff) {
        const lines = oldContent.substring(0, diff.start).split('\n')
        const line = lines.length - 1
        const column = lines[lines.length - 1].length

        if (diff.type === 'insert') {
          applyEdit('insert', line, column, diff.text)
        } else if (diff.type === 'delete') {
          applyEdit('delete', line, column, undefined, diff.length)
        }
      }

      // Set typing indicator
      setTyping(true)
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false)
      }, 1000)
    },
    [content, onChange, applyEdit, setTyping]
  )

  // Handle cursor movement
  const handleCursorMove = useCallback(() => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const text = textarea.value.substring(0, start)
    const lines = text.split('\n')
    const line = lines.length - 1
    const column = lines[lines.length - 1].length

    setCursorPosition({ line, column })
    updateCursor(line, column)

    // Update selection if there is one
    if (textarea.selectionStart !== textarea.selectionEnd) {
      const endText = textarea.value.substring(0, textarea.selectionEnd)
      const endLines = endText.split('\n')
      const endLine = endLines.length - 1
      const endColumn = endLines[endLines.length - 1].length

      updateSelection(line, column, endLine, endColumn)
    }
  }, [updateCursor, updateSelection])

  // Track cursor position on selection change
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.addEventListener('selectionchange', handleCursorMove)
    return () => {
      textarea.removeEventListener('selectionchange', handleCursorMove)
    }
  }, [handleCursorMove])

  return (
    <div className={`relative ${className}`}>
      {/* Main editor */}
      <div className="relative">
        {/* Remote cursors and selections overlay */}
        <div className="pointer-events-none absolute inset-0 z-10">
          {cursors.map((cursor) => (
            <CollaborativeCursor key={cursor.userId} cursor={cursor} />
          ))}
          {selections.map((selection) => (
            <CollaborativeSelection key={selection.userId} selection={selection} />
          ))}
        </div>

        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onSelect={handleCursorMove}
          onKeyUp={handleCursorMove}
          onClick={handleCursorMove}
          readOnly={readOnly}
          placeholder={placeholder}
          className="relative z-0 min-h-[400px] w-full rounded-md border border-gray-300 bg-white p-4 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          spellCheck={false}
        />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="mt-2">
          <TypingIndicator typingUsers={typingUsers} />
        </div>
      )}

      {/* Status bar */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <div>
          Line {cursorPosition.line + 1}, Column {cursorPosition.column + 1}
        </div>
        <div className="flex items-center gap-4">
          {cursors.length > 0 && (
            <div>
              {cursors.length} other user{cursors.length === 1 ? '' : 's'} editing
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Find the difference between two strings
 * Returns the type of change and position
 */
function findDiff(
  oldText: string,
  newText: string
):
  | { type: 'insert'; start: number; text: string }
  | { type: 'delete'; start: number; length: number }
  | null {
  // Find first difference
  let start = 0
  while (start < oldText.length && start < newText.length && oldText[start] === newText[start]) {
    start++
  }

  // Find last difference
  let oldEnd = oldText.length
  let newEnd = newText.length
  while (oldEnd > start && newEnd > start && oldText[oldEnd - 1] === newText[newEnd - 1]) {
    oldEnd--
    newEnd--
  }

  if (start === oldEnd && start === newEnd) {
    return null // No change
  }

  if (newEnd > start && oldEnd === start) {
    // Insertion
    return {
      type: 'insert',
      start,
      text: newText.substring(start, newEnd),
    }
  }

  if (oldEnd > start && newEnd === start) {
    // Deletion
    return {
      type: 'delete',
      start,
      length: oldEnd - start,
    }
  }

  // Replacement (treat as delete + insert)
  // For simplicity, we'll treat this as an insert
  return {
    type: 'insert',
    start,
    text: newText.substring(start, newEnd),
  }
}
