/**
 * POST /api/control-plane/migrate
 *
 * One-time, idempotent migration: reads ~/.nself/remote-connections.json and
 * registers each entry as a control-plane target via `nself env target add`.
 *
 * Guarded by a LokiJS config flag (`remote_connections_migrated`) so it only
 * runs once regardless of how many times the route is called.
 *
 * Auth required — mutating operation.
 * nSelf-First: all target additions go through `nself env target add`, zero
 * direct DB writes.
 * SECURITY: only file paths are accepted from stored connections — never raw
 * SSH key bytes. sshKeyPath traversal is blocked (no `..`).
 */
import { getConfig, setConfig } from '@/lib/database'
import { getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { execFile } from 'child_process'
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import os from 'os'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const MIGRATION_FLAG = 'remote_connections_migrated'

/** Shape of a stored remote connection from the pre-control-plane era. */
interface LegacyRemoteConnection {
  id?: string
  name?: string
  host?: string
  port?: number
  sshUser?: string
  sshKeyPath?: string
  apiEndpoint?: string
  mode?: string
  active?: boolean
}

function validateSafeArg(input: string): boolean {
  const SAFE_ARG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_\-.:=/]*$/
  return (
    SAFE_ARG_PATTERN.test(input) &&
    !input.includes('..') &&
    !input.includes('&&') &&
    !input.includes('||') &&
    !input.includes(';') &&
    !input.includes('`') &&
    !input.includes('$(') &&
    !input.includes('|')
  )
}

/**
 * GET /api/control-plane/migrate
 * Returns migration status (whether it has already run).
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  const alreadyRun = await getConfig(MIGRATION_FLAG)
  return NextResponse.json({
    migrated: alreadyRun === true,
    flag: MIGRATION_FLAG,
  })
}

/**
 * POST /api/control-plane/migrate
 * Runs the migration. Idempotent — safe to call multiple times.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  // Idempotency check — never re-run if already done
  const alreadyRun = await getConfig(MIGRATION_FLAG)
  if (alreadyRun === true) {
    return NextResponse.json({
      success: true,
      skipped: true,
      message: 'Migration already completed — nothing to do.',
    })
  }

  // Resolve source file: ~/.nself/remote-connections.json
  const sourceFile = path.join(os.homedir(), '.nself', 'remote-connections.json')

  if (!fs.existsSync(sourceFile)) {
    // Nothing to migrate — mark as done so we don't keep checking
    await setConfig(MIGRATION_FLAG, true)
    return NextResponse.json({
      success: true,
      skipped: true,
      message: 'No legacy remote-connections.json found — migration not needed.',
      migrated: 0,
      failed: 0,
    })
  }

  let connections: LegacyRemoteConnection[] = []
  try {
    const raw = fs.readFileSync(sourceFile, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    connections = Array.isArray(parsed) ? (parsed as LegacyRemoteConnection[]) : []
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to parse remote-connections.json',
        details: err instanceof Error ? err.message : 'Parse error',
      },
      { status: 500 }
    )
  }

  const projectPath = getProjectPath()
  const results: Array<{
    name: string
    status: 'added' | 'skipped' | 'failed'
    reason?: string
  }> = []

  for (const conn of connections) {
    const name = conn.name ?? conn.id ?? 'unknown'

    // Validate required fields
    if (!conn.host || typeof conn.host !== 'string' || !validateSafeArg(conn.host)) {
      results.push({ name, status: 'skipped', reason: 'Missing or invalid host' })
      continue
    }

    const safeName =
      (conn.name ?? conn.id ?? `remote-${results.length}`)
        .replace(/[^a-zA-Z0-9_\-]/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 63) || `remote-${results.length}`

    if (!validateSafeArg(safeName)) {
      results.push({ name, status: 'skipped', reason: 'Could not derive a safe name' })
      continue
    }

    // sshKeyPath: block path traversal, never accept raw key bytes
    if (conn.sshKeyPath !== undefined && conn.sshKeyPath.includes('..')) {
      results.push({ name, status: 'skipped', reason: 'sshKeyPath contains path traversal' })
      continue
    }

    const role = conn.mode === 'production' ? 'production' : 'staging'

    const execArgs = ['env', 'target', 'add', safeName, '--host', conn.host, '--role', role]
    if (conn.sshUser && validateSafeArg(conn.sshUser)) {
      execArgs.push('--ssh-user', conn.sshUser)
    }
    if (conn.sshKeyPath) {
      execArgs.push('--ssh-key', conn.sshKeyPath)
    }

    try {
      await execFileAsync('nself', execArgs, {
        cwd: projectPath,
        env: {
          ...process.env,
          PATH: getEnhancedPath(),
          NSELF_PROJECT_PATH: projectPath,
        },
        timeout: 30000,
      })
      results.push({ name, status: 'added' })
    } catch (err) {
      const execErr = err as { message?: string; stderr?: string }
      const reason = execErr.stderr?.trim() ?? execErr.message ?? 'CLI error'
      // Treat "already exists" as success
      if (
        reason.toLowerCase().includes('already exists') ||
        reason.toLowerCase().includes('duplicate')
      ) {
        results.push({ name, status: 'added' })
      } else {
        results.push({ name, status: 'failed', reason })
      }
    }
  }

  // Mark migration as done regardless of per-entry failures
  // (partial migrations shouldn't re-trigger a full pass on next call)
  await setConfig(MIGRATION_FLAG, true)

  const migrated = results.filter((r) => r.status === 'added').length
  const failed = results.filter((r) => r.status === 'failed').length

  return NextResponse.json({
    success: true,
    migrated,
    failed,
    skipped: results.filter((r) => r.status === 'skipped').length,
    results,
    timestamp: new Date().toISOString(),
  })
}
