/**
 * Collaboration hooks for real-time multi-user features
 * Provides presence tracking, cursor synchronization, and collaborative editing
 */
'use client'

import { getCurrentUser } from '@/lib/auth-client'
import { getWebSocketClient } from '@/lib/websocket/client'
import type {
  CursorPositionEvent,
  DocumentEditEvent,
  TextSelectionEvent,
  UserPresenceEvent,
  UserTypingEvent,
} from '@/lib/websocket/events'
import { EventType } from '@/lib/websocket/events'
import { useCallback, useEffect, useState } from 'react'

// User colors for cursors and selections
const USER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E2',
  '#F8B739',
  '#52B788',
]

/**
 * Get consistent color for user ID
 */
function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length] ?? USER_COLORS[0] ?? '#FF6B6B'
}

/**
 * Hook for tracking online users and their presence
 */
export function usePresence(roomId?: string) {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresenceEvent>>(new Map())
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const wsClient = getWebSocketClient()

    // Subscribe to presence updates
    const unsubscribePresence = wsClient.on<UserPresenceEvent>(EventType.USER_PRESENCE, (data) => {
      setOnlineUsers((prev) => {
        const next = new Map(prev)
        if (data.status === 'offline') {
          next.delete(data.userId)
        } else {
          next.set(data.userId, data)
        }
        return next
      })
    })

    // Subscribe to connection status
    const unsubscribeStatus = wsClient.onStatusChange((status) => {
      setIsConnected(status.connected)
    })

    // Connect and join room if specified
    wsClient.connect()
    if (roomId) {
      wsClient.joinRoom(roomId)
    }

    return () => {
      unsubscribePresence()
      unsubscribeStatus()
      if (roomId) {
        wsClient.leaveRoom(roomId)
      }
    }
  }, [roomId])

  const updatePresence = useCallback(
    (status: 'online' | 'away' | 'offline', currentPage?: string, currentDocument?: string) => {
      const wsClient = getWebSocketClient()
      const { userId, userName } = getCurrentUser()

      const presenceData: UserPresenceEvent = {
        userId,
        userName,
        status,
        currentPage,
        currentDocument,
        timestamp: new Date().toISOString(),
        metadata: {
          color: getUserColor(userId),
        },
      }

      wsClient.emit(EventType.USER_PRESENCE, presenceData)
    },
    []
  )

  return {
    onlineUsers: Array.from(onlineUsers.values()),
    isConnected,
    updatePresence,
  }
}

/**
 * Hook for collaborative editing with cursor synchronization
 */
export function useCollaborativeEditor(documentId: string, roomId?: string) {
  const [cursors, setCursors] = useState<Map<string, CursorPositionEvent>>(new Map())
  const [selections, setSelections] = useState<Map<string, TextSelectionEvent>>(new Map())
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [documentVersion, setDocumentVersion] = useState(0)

  useEffect(() => {
    const wsClient = getWebSocketClient()

    // Subscribe to cursor position updates
    const unsubscribeCursor = wsClient.on<CursorPositionEvent>(
      EventType.CURSOR_POSITION,
      (data) => {
        if (data.documentId === documentId) {
          setCursors((prev) => {
            const next = new Map(prev)
            next.set(data.userId, data)
            return next
          })
        }
      }
    )

    // Subscribe to text selection updates
    const unsubscribeSelection = wsClient.on<TextSelectionEvent>(
      EventType.TEXT_SELECTION,
      (data) => {
        if (data.documentId === documentId) {
          setSelections((prev) => {
            const next = new Map(prev)
            next.set(data.userId, data)
            return next
          })
        }
      }
    )

    // Subscribe to typing indicators
    const unsubscribeTyping = wsClient.on<UserTypingEvent>(EventType.USER_TYPING, (data) => {
      if (data.documentId === documentId) {
        setTypingUsers((prev) => {
          const next = new Set(prev)
          if (data.isTyping) {
            next.add(data.userId)
          } else {
            next.delete(data.userId)
          }
          return next
        })
      }
    })

    // Subscribe to document edits
    const unsubscribeEdit = wsClient.on<DocumentEditEvent>(EventType.DOCUMENT_EDIT, (data) => {
      if (data.documentId === documentId) {
        setDocumentVersion(data.version)
      }
    })

    // Connect and join room
    wsClient.connect()
    if (roomId) {
      wsClient.joinRoom(roomId)
    }

    return () => {
      unsubscribeCursor()
      unsubscribeSelection()
      unsubscribeTyping()
      unsubscribeEdit()
      if (roomId) {
        wsClient.leaveRoom(roomId)
      }
    }
  }, [documentId, roomId])

  const updateCursor = useCallback(
    (line: number, column: number) => {
      const wsClient = getWebSocketClient()
      const { userId, userName } = getCurrentUser()

      const cursorData: CursorPositionEvent = {
        userId,
        userName,
        documentId,
        position: { line, column },
        color: getUserColor(userId),
        timestamp: new Date().toISOString(),
      }

      wsClient.emit(EventType.CURSOR_POSITION, cursorData)
    },
    [documentId]
  )

  const updateSelection = useCallback(
    (startLine: number, startColumn: number, endLine: number, endColumn: number) => {
      const wsClient = getWebSocketClient()
      const { userId, userName } = getCurrentUser()

      const selectionData: TextSelectionEvent = {
        userId,
        userName,
        documentId,
        selection: {
          start: { line: startLine, column: startColumn },
          end: { line: endLine, column: endColumn },
        },
        color: getUserColor(userId),
        timestamp: new Date().toISOString(),
      }

      wsClient.emit(EventType.TEXT_SELECTION, selectionData)
    },
    [documentId]
  )

  const setTyping = useCallback(
    (isTyping: boolean) => {
      const wsClient = getWebSocketClient()
      const { userId, userName } = getCurrentUser()

      const typingData: UserTypingEvent = {
        userId,
        userName,
        documentId,
        isTyping,
        timestamp: new Date().toISOString(),
      }

      wsClient.emit(EventType.USER_TYPING, typingData)
    },
    [documentId]
  )

  const applyEdit = useCallback(
    (
      type: 'insert' | 'delete' | 'replace',
      line: number,
      column: number,
      text?: string,
      length?: number
    ) => {
      const wsClient = getWebSocketClient()
      const { userId, userName } = getCurrentUser()

      const editData: DocumentEditEvent = {
        userId,
        userName,
        documentId,
        operationId: `${userId}-${Date.now()}`,
        operation: {
          type,
          position: { line, column },
          text,
          length,
        },
        version: documentVersion + 1,
        timestamp: new Date().toISOString(),
        parentVersion: documentVersion,
      }

      wsClient.emit(EventType.DOCUMENT_EDIT, editData)
      setDocumentVersion((v) => v + 1)
    },
    [documentId, documentVersion]
  )

  return {
    cursors: Array.from(cursors.values()),
    selections: Array.from(selections.values()),
    typingUsers: Array.from(typingUsers),
    documentVersion,
    updateCursor,
    updateSelection,
    setTyping,
    applyEdit,
  }
}

/**
 * Hook for document locking to prevent conflicts
 */
export function useDocumentLock(documentId: string) {
  const [isLocked, setIsLocked] = useState(false)
  const [lockedBy, setLockedBy] = useState<string | null>(null)

  const lockDocument = useCallback(async () => {
    try {
      const response = await fetch('/api/collaboration/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, action: 'lock' }),
      })
      const data = await response.json()
      if (data.success) {
        setIsLocked(true)
        setLockedBy(data.userId)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to lock document:', error)
      return false
    }
  }, [documentId])

  const unlockDocument = useCallback(async () => {
    try {
      const response = await fetch('/api/collaboration/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, action: 'unlock' }),
      })
      const data = await response.json()
      if (data.success) {
        setIsLocked(false)
        setLockedBy(null)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to unlock document:', error)
      return false
    }
  }, [documentId])

  return {
    isLocked,
    lockedBy,
    lockDocument,
    unlockDocument,
  }
}
