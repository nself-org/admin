/**
 * @deprecated This file is a legacy shim. Use the WebSocket modules directly:
 *
 * Client:  import { WebSocketClient, getWebSocketClient } from '@/lib/websocket/client'
 * Server:  import { WebSocketServer, getWebSocketServer } from '@/lib/websocket/server'
 * Events:  import { EventType, WebSocketMessage } from '@/lib/websocket/events'
 * Hooks:   import { useWebSocket } from '@/hooks/useWebSocket'
 *
 * The original raw-WebSocket implementation has been removed in favor of
 * the Socket.io-based client/server in src/lib/websocket/.
 */

export {
  getWebSocketClient as default,
  getWebSocketClient as getWebSocketService,
} from '@/lib/websocket/client'
export type { ConnectionStatus, WebSocketMessage } from '@/lib/websocket/events'
