import { execSync } from 'child_process'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/backups — list available backups
 *
 * Calls `nself backup list --json` and falls back to scanning the backup
 * directory when the CLI does not support JSON output.
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Attempt CLI list first
    try {
      const raw = execSync('nself backup list --json', {
        timeout: 15_000,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      const parsed = JSON.parse(raw) as Array<{
        filename: string
        created_at: string
        size_bytes: number
      }>
      return NextResponse.json({ backups: parsed })
    } catch {
      // CLI does not support --json or is unavailable — fall through to fs scan
    }

    // Fallback: scan backup directories
    const fs = await import('fs/promises')
    const path = await import('path')

    const candidates = [
      process.env.NSELF_BACKUP_DIR,
      '/opt/nself/backups',
      '/backups',
      './backups',
    ].filter(Boolean) as string[]

    interface BackupEntry {
      filename: string
      created_at: string
      size_bytes: number
    }

    const backups: BackupEntry[] = []

    for (const dir of candidates) {
      try {
        const files = await fs.readdir(dir)
        for (const file of files) {
          if (/\.(sql|dump)(\.gz)?$/.test(file)) {
            const full = path.join(dir, file)
            const stat = await fs.stat(full)
            backups.push({
              filename: file,
              created_at: stat.mtime.toISOString(),
              size_bytes: stat.size,
            })
          }
        }
      } catch (_err) {
        // directory does not exist — skip
      }
    }

    backups.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    return NextResponse.json({ backups })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list backups' },
      { status: 500 },
    )
  }
}
