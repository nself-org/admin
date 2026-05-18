/**
 * WebSocket Event Emitters
 * Helper functions to emit events to connected WebSocket clients
 */

import {
  BuildProgressEvent,
  DbQueryResultEvent,
  DeployProgressEvent,
  DockerStatsEvent,
  EventType,
  LogStreamEvent,
  ServiceStatusEvent,
} from '@/lib/websocket/events'
import { getWebSocketServer } from '@/lib/websocket/server'

/**
 * Emit service status update
 */
export function emitServiceStatus(data: ServiceStatusEvent, room?: string): void {
  try {
    const wsServer = getWebSocketServer()
    if (room) {
      wsServer.broadcastToRoom(room, EventType.SERVICE_STATUS, data)
    } else {
      wsServer.broadcast(EventType.SERVICE_STATUS, data)
    }
  } catch (error) {
    console.error('Failed to emit service status:', error)
  }
}

/**
 * Emit build progress update
 */
export function emitBuildProgress(data: BuildProgressEvent, room?: string): void {
  try {
    const wsServer = getWebSocketServer()
    if (room) {
      wsServer.broadcastToRoom(room, EventType.BUILD_PROGRESS, data)
    } else {
      wsServer.broadcast(EventType.BUILD_PROGRESS, data)
    }
  } catch (error) {
    console.error('Failed to emit build progress:', error)
  }
}

/**
 * Emit deploy progress update
 */
export function emitDeployProgress(data: DeployProgressEvent, room?: string): void {
  try {
    const wsServer = getWebSocketServer()
    if (room) {
      wsServer.broadcastToRoom(room, EventType.DEPLOY_PROGRESS, data)
    } else {
      wsServer.broadcast(EventType.DEPLOY_PROGRESS, data)
    }
  } catch (error) {
    console.error('Failed to emit deploy progress:', error)
  }
}

/**
 * Emit log stream event
 */
export function emitLogStream(data: LogStreamEvent, room?: string): void {
  try {
    const wsServer = getWebSocketServer()
    if (room) {
      wsServer.batchEvent(room, EventType.LOGS_STREAM, data)
    } else {
      wsServer.broadcast(EventType.LOGS_STREAM, data)
    }
  } catch (error) {
    console.error('Failed to emit log stream:', error)
  }
}

/**
 * Emit Docker stats update
 */
export function emitDockerStats(data: DockerStatsEvent, room?: string): void {
  try {
    const wsServer = getWebSocketServer()
    if (room) {
      wsServer.batchEvent(room, EventType.DOCKER_STATS, data)
    } else {
      wsServer.broadcast(EventType.DOCKER_STATS, data)
    }
  } catch (error) {
    console.error('Failed to emit Docker stats:', error)
  }
}

/**
 * Emit database query result
 */
export function emitDbQueryResult(data: DbQueryResultEvent, room?: string): void {
  try {
    const wsServer = getWebSocketServer()
    if (room) {
      wsServer.broadcastToRoom(room, EventType.DB_QUERY_RESULT, data)
    } else {
      wsServer.broadcast(EventType.DB_QUERY_RESULT, data)
    }
  } catch (error) {
    console.error('Failed to emit database query result:', error)
  }
}

/**
 * Collaboration Event Emitters (v0.7.0)
 */

import type {
  CursorPositionEvent,
  DocumentEditEvent,
  DocumentLockEvent,
  TextSelectionEvent,
  UserPresenceEvent,
  UserTypingEvent,
} from '@/lib/websocket/events'

/**
 * Emit user presence update
 */
export function emitUserPresence(data: UserPresenceEvent, room?: string): void {
  try {
    const wsServer = getWebSocketServer()
    if (room) {
      wsServer.broadcastToRoom(room, EventType.USER_PRESENCE, data)
    } else {
      wsServer.broadcast(EventType.USER_PRESENCE, data)
    }
  } catch (error) {
    console.error('Failed to emit user presence:', error)
  }
}

/**
 * Emit user typing indicator
 */
export function emitUserTyping(data: UserTypingEvent, room?: string): void {
  try {
    const wsServer = getWebSocketServer()
    if (room) {
      wsServer.batchEvent(room, EventType.USER_TYPING, data)
    } else {
      wsServer.broadcast(EventType.USER_TYPING, data)
    }
  } catch (error) {
    console.error('Failed to emit user typing:', error)
  }
}

/**
 * Emit cursor position update
 */
export function emitCursorPosition(data: CursorPositionEvent, room?: string): void {
  try {
    const wsServer = getWebSocketServer()
    if (room) {
      wsServer.batchEvent(room, EventType.CURSOR_POSITION, data)
    } else {
      wsServer.broadcast(EventType.CURSOR_POSITION, data)
    }
  } catch (error) {
    console.error('Failed to emit cursor position:', error)
  }
}

/**
 * Emit text selection update
 */
export function emitTextSelection(data: TextSelectionEvent, room?: string): void {
  try {
    const wsServer = getWebSocketServer()
    if (room) {
      wsServer.batchEvent(room, EventType.TEXT_SELECTION, data)
    } else {
      wsServer.broadcast(EventType.TEXT_SELECTION, data)
    }
  } catch (error) {
    console.error('Failed to emit text selection:', error)
  }
}

/**
 * Emit document edit operation
 */
export function emitDocumentEdit(data: DocumentEditEvent, room?: string): void {
  try {
    const wsServer = getWebSocketServer()
    if (room) {
      wsServer.broadcastToRoom(room, EventType.DOCUMENT_EDIT, data)
    } else {
      wsServer.broadcast(EventType.DOCUMENT_EDIT, data)
    }
  } catch (error) {
    console.error('Failed to emit document edit:', error)
  }
}

/**
 * Emit document lock/unlock event
 */
export function emitDocumentLock(data: DocumentLockEvent, room?: string): void {
  try {
    const wsServer = getWebSocketServer()
    if (room) {
      wsServer.broadcastToRoom(room, EventType.DOCUMENT_LOCK, data)
    } else {
      wsServer.broadcast(EventType.DOCUMENT_LOCK, data)
    }
  } catch (error) {
    console.error('Failed to emit document lock:', error)
  }
}
