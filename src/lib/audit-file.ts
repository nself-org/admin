/**
 * admin-audit.log — file-based audit trail
 *
 * Writes every mutation to {projectPath}/.nself/admin-audit.log.
 * Rotates at 10 MB (rename to admin-audit.log.1, open fresh file).
 * Format: one JSON object per line (ndjson), ISO timestamp + user + action
 *         + source-ip + before/after diff.
 */

import fs from 'fs'
import path from 'path'
import { getProjectPath } from './paths'

const MAX_LOG_BYTES = 10 * 1024 * 1024 // 10 MB

export interface AuditFileEntry {
  timestamp: string
  user: string
  action: string
  sourceIp: string
  method?: string
  path?: string
  before?: unknown
  after?: unknown
  success: boolean
  details?: unknown
}

function resolveLogPath(): string {
  try {
    const projectPath = getProjectPath()
    const nselfDir = path.join(projectPath, '.nself')
    if (!fs.existsSync(nselfDir)) {
      fs.mkdirSync(nselfDir, { recursive: true })
    }
    return path.join(nselfDir, 'admin-audit.log')
  } catch {
    // Fallback to process cwd data dir (dev mode or no project configured yet)
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    return path.join(dataDir, 'admin-audit.log')
  }
}

function rotatIfNeeded(logPath: string): void {
  try {
    const stat = fs.statSync(logPath)
    if (stat.size >= MAX_LOG_BYTES) {
      const rotated = logPath + '.1'
      // Overwrite any existing .1 rotation
      if (fs.existsSync(rotated)) fs.unlinkSync(rotated)
      fs.renameSync(logPath, rotated)
    }
  } catch {
    // File may not exist yet — that is fine
  }
}

/**
 * Append one audit entry to the file-based audit log.
 * Non-blocking: errors are logged to stderr but never thrown.
 */
export function appendAuditFile(entry: AuditFileEntry): void {
  try {
    const logPath = resolveLogPath()
    rotatIfNeeded(logPath)
    const line = JSON.stringify(entry) + '\n'
    fs.appendFileSync(logPath, line, 'utf8')
  } catch (err) {
    console.error('[audit-file] Failed to write audit log:', err)
  }
}

/**
 * Extract source IP from request headers.
 */
export function extractSourceIp(
  headers: Headers | Record<string, string | string[] | undefined>,
): string {
  const get = (key: string): string | null => {
    if (headers instanceof Headers) return headers.get(key)
    const v = (headers as Record<string, string | string[] | undefined>)[key]
    if (!v) return null
    return Array.isArray(v) ? v[0] : v
  }

  const forwarded = get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return get('x-real-ip') || 'unknown'
}
