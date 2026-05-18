/**
 * WebSocket Event Types and Interfaces
 * Defines all real-time events used across nself-admin
 */

export enum EventType {
  // Service status updates
  SERVICE_STATUS = 'service:status',

  // Build progress updates
  BUILD_PROGRESS = 'build:progress',

  // Deploy progress updates
  DEPLOY_PROGRESS = 'deploy:progress',

  // Log streaming
  LOGS_STREAM = 'logs:stream',

  // Docker statistics
  DOCKER_STATS = 'docker:stats',

  // Database query results
  DB_QUERY_RESULT = 'db:query:result',

  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  HEARTBEAT = 'heartbeat',
  PONG = 'pong',

  // Room events
  JOIN_ROOM = 'join:room',
  LEAVE_ROOM = 'leave:room',

  // Collaboration events (v0.7.0)
  USER_PRESENCE = 'collab:presence',
  USER_TYPING = 'collab:typing',
  CURSOR_POSITION = 'collab:cursor',
  TEXT_SELECTION = 'collab:selection',
  DOCUMENT_EDIT = 'collab:edit',
  DOCUMENT_LOCK = 'collab:lock',
  DOCUMENT_UNLOCK = 'collab:unlock',

  // Error events
  ERROR = 'error',
}

// Service Status Event
export interface ServiceStatusEvent {
  service: string
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'unhealthy'
  timestamp: string
  containerId?: string
  health?: {
    status: 'healthy' | 'unhealthy' | 'pending'
    lastCheck?: string
  }
  resources?: {
    cpu?: number
    memory?: number
  }
}

// Build Progress Event
export interface BuildProgressEvent {
  step: string
  progress: number // 0-100
  status: 'pending' | 'in-progress' | 'complete' | 'failed'
  message?: string
  timestamp: string
  totalSteps?: number
  currentStep?: number
  logs?: string[]
}

// Deploy Progress Event
export interface DeployProgressEvent {
  stage: string
  environment: 'local' | 'staging' | 'production'
  status: 'pending' | 'in-progress' | 'complete' | 'failed'
  logs: string[]
  timestamp: string
  progress?: number // 0-100
  error?: string
}

// Log Stream Event
export interface LogStreamEvent {
  service: string
  line: string
  timestamp: string
  level?: 'info' | 'warn' | 'error' | 'debug'
  source?: 'stdout' | 'stderr'
}

// Docker Stats Event
export interface DockerStatsEvent {
  containerId: string
  containerName: string
  stats: {
    cpu: number // percentage
    memory: number // bytes
    memoryLimit: number // bytes
    memoryPercent: number // percentage
    network: {
      rx: number // bytes received
      tx: number // bytes transmitted
    }
    blockIO: {
      read: number // bytes
      write: number // bytes
    }
  }
  timestamp: string
}

// Database Query Result Event
export interface DbQueryResultEvent {
  queryId: string
  rows: unknown[]
  rowCount: number
  fields: Array<{
    name: string
    dataTypeID: number
  }>
  executionTime?: number // milliseconds
  timestamp: string
  error?: string
}

// WebSocket Message
export interface WebSocketMessage<T = unknown> {
  type: EventType
  data: T
  timestamp: string
  room?: string
}

// Room configuration
export interface RoomConfig {
  userId: string
  projectPath: string
  services?: string[]
  subscriptions?: EventType[]
}

// Connection status
export interface ConnectionStatus {
  connected: boolean
  reconnecting: boolean
  lastConnected?: string
  reconnectAttempts: number
}

// Event batching configuration
export interface EventBatchConfig {
  maxSize: number // max events per batch
  maxWait: number // max milliseconds to wait before sending
}

// Heartbeat configuration
export const HEARTBEAT_INTERVAL = 30000 // 30 seconds
export const HEARTBEAT_TIMEOUT = 10000 // 10 seconds

// Reconnection configuration
export const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000] // exponential backoff in ms

// Event batch defaults
export const DEFAULT_BATCH_CONFIG: EventBatchConfig = {
  maxSize: 10,
  maxWait: 100, // 100ms
}

// Type guards
export function isServiceStatusEvent(data: unknown): data is ServiceStatusEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'service' in data &&
    'status' in data &&
    'timestamp' in data
  )
}

export function isBuildProgressEvent(data: unknown): data is BuildProgressEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'step' in data &&
    'progress' in data &&
    'status' in data &&
    'timestamp' in data
  )
}

export function isDeployProgressEvent(data: unknown): data is DeployProgressEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'stage' in data &&
    'environment' in data &&
    'status' in data &&
    'logs' in data &&
    'timestamp' in data
  )
}

export function isLogStreamEvent(data: unknown): data is LogStreamEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'service' in data &&
    'line' in data &&
    'timestamp' in data
  )
}

export function isDockerStatsEvent(data: unknown): data is DockerStatsEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'containerId' in data &&
    'containerName' in data &&
    'stats' in data &&
    'timestamp' in data
  )
}

export function isDbQueryResultEvent(data: unknown): data is DbQueryResultEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'queryId' in data &&
    'rows' in data &&
    'rowCount' in data &&
    'timestamp' in data
  )
}

// =============================================================================
// Collaboration Events (v0.7.0)
// =============================================================================

// User Presence Event
export interface UserPresenceEvent {
  userId: string
  userName: string
  status: 'online' | 'away' | 'offline'
  currentPage?: string
  currentDocument?: string
  timestamp: string
  metadata?: {
    avatarUrl?: string
    color?: string
  }
}

// User Typing Indicator Event
export interface UserTypingEvent {
  userId: string
  userName: string
  documentId: string
  isTyping: boolean
  timestamp: string
}

// Cursor Position Event
export interface CursorPositionEvent {
  userId: string
  userName: string
  documentId: string
  position: {
    line: number
    column: number
  }
  color: string
  timestamp: string
}

// Text Selection Event
export interface TextSelectionEvent {
  userId: string
  userName: string
  documentId: string
  selection: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
  color: string
  timestamp: string
}

// Document Edit Event (Operational Transformation)
export interface DocumentEditEvent {
  userId: string
  userName: string
  documentId: string
  operationId: string
  operation: {
    type: 'insert' | 'delete' | 'replace'
    position: { line: number; column: number }
    text?: string
    length?: number
  }
  version: number
  timestamp: string
  parentVersion?: number
}

// Document Lock Event
export interface DocumentLockEvent {
  userId: string
  userName: string
  documentId: string
  locked: boolean
  timestamp: string
}

// Type guards for collaboration events
export function isUserPresenceEvent(data: unknown): data is UserPresenceEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'userId' in data &&
    'status' in data &&
    'timestamp' in data
  )
}

export function isUserTypingEvent(data: unknown): data is UserTypingEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'userId' in data &&
    'documentId' in data &&
    'isTyping' in data &&
    'timestamp' in data
  )
}

export function isCursorPositionEvent(data: unknown): data is CursorPositionEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'userId' in data &&
    'documentId' in data &&
    'position' in data &&
    'timestamp' in data
  )
}

export function isTextSelectionEvent(data: unknown): data is TextSelectionEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'userId' in data &&
    'documentId' in data &&
    'selection' in data &&
    'timestamp' in data
  )
}

export function isDocumentEditEvent(data: unknown): data is DocumentEditEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'userId' in data &&
    'documentId' in data &&
    'operation' in data &&
    'version' in data &&
    'timestamp' in data
  )
}

export function isDocumentLockEvent(data: unknown): data is DocumentLockEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'userId' in data &&
    'documentId' in data &&
    'locked' in data &&
    'timestamp' in data
  )
}
