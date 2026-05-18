import { execFileSync } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

/**
 * POST /api/admin/backups/restore — restore a named backup
 *
 * Body: { filename: string }
 *
 * Calls `nself backup restore <filename>` via execFileSync (argv array, no
 * shell expansion). The caller must have already confirmed the RESTORE gate in
 * the UI — this route trusts that confirmation was enforced client-side.
 *
 * Destructive operation: overwrites all database data.
 */

/**
 * Backup filenames match the pattern produced by `nself backup create`:
 * - Must start with an alphanumeric character (rejects dot-files and flag-prefixed names)
 * - May contain alphanumeric characters, dots, hyphens, and underscores
 * - No slashes, spaces, or shell metacharacters
 * Examples: "backup-2026-05-15.sql.gz", "nself_backup_1234567890.dump"
 */
const SAFE_FILENAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  let filename: string

  try {
    const body = (await request.json()) as { filename?: string }
    filename = (body.filename ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!filename) {
    return NextResponse.json({ error: 'filename is required' }, { status: 400 })
  }

  // Strict allowlist validation: only safe backup filename characters permitted.
  // Rejects path traversal (slashes, leading dots) and shell metacharacters.
  if (!SAFE_FILENAME_RE.test(filename)) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  try {
    // execFileSync with argv array — no shell invoked, no interpolation risk.
    // '--' separates options from the positional filename argument.
    const output = execFileSync('nself', ['backup', 'restore', '--', filename], {
      timeout: 300_000, // 5 min ceiling — restore can be slow
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    return NextResponse.json({ ok: true, output: output.trim() })
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'stderr' in err
          ? String((err as { stderr: unknown }).stderr)
          : 'nself backup restore failed'

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
