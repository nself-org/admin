/**
 * Core logic for the remote-mode feature.
 * Manages ~/.nself/remote-connections.json — stores, reads, and mutates saved
 * remote-server connections.
 *
 * SERVER-SIDE ONLY. Never import from client components — import from API routes only.
 */

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type {
  RemoteConnection,
  RemoteConnectionsStore,
  RemoteError,
  TestConnectionResult,
} from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_STORE: RemoteConnectionsStore = {
  version: 1,
  connections: [],
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function makeRemoteError(
  message: string,
  code: RemoteError['code'],
): RemoteError {
  const err = new Error(message) as RemoteError
  err.code = code
  return err
}

function getStorePath(): string {
  return path.join(os.homedir(), '.nself', 'remote-connections.json')
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

/**
 * Reads and parses ~/.nself/remote-connections.json.
 * Returns an empty store when the file does not exist yet.
 */
export async function loadConnections(): Promise<RemoteConnectionsStore> {
  const storePath = getStorePath()

  try {
    const raw = await fs.readFile(storePath, 'utf-8')
    const parsed = JSON.parse(raw) as RemoteConnectionsStore

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.connections)
    ) {
      throw makeRemoteError(
        'remote-connections.json has an unexpected structure',
        'PARSE_ERROR',
      )
    }
    return parsed
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException
    if (nodeErr.code === 'ENOENT') {
      return { ...EMPTY_STORE, connections: [] }
    }
    if ((err as RemoteError).code !== undefined) {
      throw err
    }
    throw makeRemoteError(
      `Failed to load remote connections: ${(err as Error).message}`,
      'IO_ERROR',
    )
  }
}

/**
 * Persists the store to disk atomically: writes to a temp file then renames
 * to the final path so readers never see a partial write.
 */
async function saveStore(store: RemoteConnectionsStore): Promise<void> {
  const storePath = getStorePath()
  const dir = path.dirname(storePath)
  const tmpPath = `${storePath}.tmp.${Date.now()}`

  try {
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(tmpPath, JSON.stringify(store, null, 2), 'utf-8')
    await fs.rename(tmpPath, storePath)
  } catch (err) {
    try {
      await fs.unlink(tmpPath)
    } catch {
      // Ignore cleanup errors.
    }
    throw makeRemoteError(
      `Failed to save remote connections: ${(err as Error).message}`,
      'IO_ERROR',
    )
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Adds a new connection to the store. Generates a UUID for the id field.
 * Returns the saved connection (including the assigned id).
 */
export async function addConnection(
  conn: Omit<RemoteConnection, 'id'>,
): Promise<RemoteConnection> {
  const store = await loadConnections()

  const entry: RemoteConnection = {
    ...conn,
    id: crypto.randomUUID(),
  }

  store.connections.push(entry)
  await saveStore(store)
  return entry
}

/**
 * Removes the connection with the given id.
 * Returns true when the connection was found and removed, false when not found.
 */
export async function removeConnection(id: string): Promise<boolean> {
  const store = await loadConnections()

  const index = store.connections.findIndex((c) => c.id === id)
  if (index === -1) {
    return false
  }

  store.connections.splice(index, 1)
  await saveStore(store)
  return true
}

/**
 * Marks the connection with the given id as active and clears the active flag
 * on all other connections.
 * Throws RemoteError with code NOT_FOUND when id does not exist.
 */
export async function setActiveConnection(id: string): Promise<void> {
  const store = await loadConnections()

  const target = store.connections.find((c) => c.id === id)
  if (target === undefined) {
    throw makeRemoteError(`Remote connection not found: ${id}`, 'NOT_FOUND')
  }

  for (const conn of store.connections) {
    conn.active = conn.id === id
  }

  await saveStore(store)
}

/**
 * Returns the currently active connection, or null when none is active.
 */
export async function getActiveConnection(): Promise<RemoteConnection | null> {
  const store = await loadConnections()
  return store.connections.find((c) => c.active) ?? null
}

/**
 * Tests whether the given connection is reachable.
 *
 * For SSH mode: spawns `ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new
 * -p <port> <user>@<host> echo ok` and measures round-trip time.
 *
 * For API mode: fetches `<apiEndpoint>/api/health` with a 5 s timeout and
 * checks for a 2xx response.
 */
export async function testConnection(
  conn: RemoteConnection,
): Promise<TestConnectionResult> {
  const start = Date.now()

  if (conn.mode === 'ssh') {
    return testSSH(conn, start)
  }
  return testAPI(conn, start)
}

async function testSSH(
  conn: RemoteConnection,
  start: number,
): Promise<TestConnectionResult> {
  const { spawn } = await import('child_process')

  return new Promise((resolve) => {
    const args = [
      '-o',
      'ConnectTimeout=5',
      '-o',
      'StrictHostKeyChecking=accept-new',
      '-p',
      String(conn.port),
    ]

    if (conn.sshKeyPath.length > 0) {
      args.push('-i', conn.sshKeyPath)
    }

    args.push(`${conn.sshUser}@${conn.host}`, 'echo', 'ok')

    const proc = spawn('ssh', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const chunks: Buffer[] = []

    proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    proc.stderr.on('data', (chunk: Buffer) => chunks.push(chunk))

    proc.on('close', (code) => {
      const latencyMs = Date.now() - start
      if (code === 0) {
        resolve({
          success: true,
          latencyMs,
          message: `SSH connection to ${conn.host}:${conn.port} succeeded.`,
        })
      } else {
        const output = Buffer.concat(chunks).toString('utf-8').trim()
        resolve({
          success: false,
          latencyMs,
          message: `SSH connection to ${conn.host}:${conn.port} failed (exit ${code}): ${output}`,
        })
      }
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        latencyMs: Date.now() - start,
        message: `SSH spawn error: ${err.message}`,
      })
    })
  })
}

async function testAPI(
  conn: RemoteConnection,
  start: number,
): Promise<TestConnectionResult> {
  const url = `${conn.apiEndpoint}/api/health`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)

    let resp: Response
    try {
      resp = await fetch(url, { signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }

    const latencyMs = Date.now() - start

    if (resp.ok) {
      return {
        success: true,
        latencyMs,
        message: `API health check at ${url} returned ${resp.status}.`,
      }
    }
    return {
      success: false,
      latencyMs,
      message: `API health check at ${url} returned status ${resp.status}.`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      latencyMs: Date.now() - start,
      message: `API health check at ${url} failed: ${msg}`,
    }
  }
}
