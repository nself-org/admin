/**
 * Types for the remote-mode feature.
 * Manages saved connections to remote nCloud servers and tracks which one is active.
 */

/** Transport mode used to reach a remote nCloud server. */
export type RemoteMode = 'ssh' | 'api'

/** A single saved connection to a remote nCloud server. */
export interface RemoteConnection {
  /** Unique identifier — assigned on creation, never changes. */
  id: string
  /** Short human-readable label, e.g. "prod-hetzner". */
  name: string
  /** Hostname or IP address of the remote server. */
  host: string
  /** SSH port number (only used when mode is "ssh"). */
  port: number
  /** Login username for SSH connections. */
  sshUser: string
  /** Absolute path to the SSH private key file. */
  sshKeyPath: string
  /** Base URL of the server HTTP API, e.g. "https://cloud.example.com". */
  apiEndpoint: string
  /** Transport mode: "ssh" or "api". */
  mode: RemoteMode
  /** Whether this connection is currently selected. At most one is active. */
  active: boolean
}

/** Root structure of ~/.nself/remote-connections.json */
export interface RemoteConnectionsStore {
  version: 1
  connections: RemoteConnection[]
}

/** Result returned after testing whether a connection is reachable. */
export interface TestConnectionResult {
  /** True when the target responded successfully. */
  success: boolean
  /** Round-trip time in milliseconds, or -1 when the test failed before completion. */
  latencyMs: number
  /** Human-readable description of the outcome. */
  message: string
}

/** Structured error thrown by remote-mode logic. */
export interface RemoteError extends Error {
  code: 'IO_ERROR' | 'CONNECT_FAILED' | 'NOT_FOUND' | 'PARSE_ERROR'
}
